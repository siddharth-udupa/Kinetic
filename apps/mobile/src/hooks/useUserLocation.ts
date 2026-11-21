import { useCallback, useEffect, useRef, useState } from "react"
import { Platform } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

export type UserLocation = {
  latitude: number
  longitude: number
  /** Horizontal accuracy in metres, as reported by the device. */
  accuracy: number | null
}

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "manual"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported"

type UseUserLocationOptions = {
  /** Ask for permission as soon as the component mounts. */
  requestOnMount?: boolean
}

/**
 * A fix can hang on some devices when the provider has no lock, and the
 * planner would sit in "locating" forever without a deadline.
 */
const FIX_TIMEOUT_MS = 20_000

/** Above this the device's answer is a network guess rather than a position
 *  worth starting a loop from — typically a browser's IP lookup. */
export const APPROXIMATE_ACCURACY_METRES = 1_000

export function isApproximateFix(location: UserLocation | null): boolean {
  return (
    location !== null &&
    (location.accuracy === null ||
      location.accuracy > APPROXIMATE_ACCURACY_METRES)
  )
}

/* A browser fix can land in the wrong city, and a device may refuse location
   entirely. The point a visitor places on the map is therefore remembered, so
   their correction survives a reload instead of being replaced by the same
   bad guess. */
const MANUAL_LOCATION_KEY = "kinetic:start-location"

/** Web geolocation codes: 1 is denied, 3 is a timeout. */
function statusForWebError(code: number): LocationStatus {
  if (code === 1) return "denied"
  if (code === 3) return "timeout"
  return "unavailable"
}

let Location: typeof import("expo-location") | null = null

try {
  Location = require("expo-location")
} catch {
  // expo-location is an optional native module. React Native Web and Expo Go
  // fall through to the browser's geolocation API instead.
}

/**
 * One precise fix for the screens that need to start at the athlete, with the
 * permission outcome kept as state so the UI can ask again after a refusal.
 *
 * On native the OS only prompts while permission is undecided, so `request`
 * doubles as the retry action: after a denial it resolves to null until the
 * visitor changes the app permission in settings.
 *
 * A fix can still be wrong, so `setManualLocation` lets the map override it
 * with a point the visitor chose. That choice outranks the device until they
 * ask for the device location again.
 */
export function useUserLocation({
  requestOnMount = false,
}: UseUserLocationOptions = {}) {
  const [gpsLocation, setGpsLocation] = useState<UserLocation | null>(null)
  const [manualLocation, setManualLocationState] =
    useState<UserLocation | null>(null)
  const [status, setStatus] = useState<LocationStatus>("idle")
  const [isHydrated, setIsHydrated] = useState(false)

  const manualRef = useRef<UserLocation | null>(null)
  const mountedRef = useRef(true)
  const pendingRef = useRef<Promise<UserLocation | null> | null>(null)
  const autoRequestedRef = useRef(false)

  const request = useCallback((): Promise<UserLocation | null> => {
    // The visitor's own choice is already a valid start point; never replace it
    // with the device's guess just because something asked to locate.
    if (manualRef.current) return Promise.resolve(manualRef.current)

    // Every caller shares the one in-flight fix, so a route request that lands
    // while the page-load prompt is still open waits for the same answer.
    if (pendingRef.current) return pendingRef.current

    const settle = (
      next: UserLocation | null,
      nextStatus: LocationStatus,
    ): UserLocation | null => {
      if (!mountedRef.current) return null
      // A point chosen while the device was answering outranks the fix.
      if (manualRef.current) return manualRef.current
      if (next) setGpsLocation(next)
      setStatus(nextStatus)
      return next
    }

    setStatus((current) => (current === "granted" ? current : "requesting"))

    const pending = (async (): Promise<UserLocation | null> => {
      if (Platform.OS === "web") {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          return settle(null, "unsupported")
        }

        return new Promise<UserLocation | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve(
                settle(
                  {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: Number.isFinite(position.coords.accuracy)
                      ? position.coords.accuracy
                      : null,
                  },
                  "granted",
                ),
              )
            },
            (error) => {
              resolve(settle(null, statusForWebError(error.code)))
            },
            // A fresh, high-accuracy fix: the loop starts from this point, so
            // a cached or coarse city-level position would put the route elsewhere.
            { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
          )
        })
      }

      if (
        !Location ||
        typeof Location.requestForegroundPermissionsAsync !== "function"
      ) {
        return settle(null, "unsupported")
      }

      try {
        if (typeof Location.hasServicesEnabledAsync === "function") {
          const servicesEnabled = await Location.hasServicesEnabledAsync().catch(
            () => true,
          )
          if (!servicesEnabled) return settle(null, "unavailable")
        }

        const permission = await Location.requestForegroundPermissionsAsync()
        if (permission.status !== "granted") return settle(null, "denied")

        const position = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          }),
          new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), FIX_TIMEOUT_MS)
          }),
        ])

        if (!position) return settle(null, "timeout")

        const accuracy = position.coords.accuracy

        return settle(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Number.isFinite(accuracy) ? accuracy : null,
          },
          "granted",
        )
      } catch {
        return settle(null, "unavailable")
      }
    })()

    pendingRef.current = pending.finally(() => {
      pendingRef.current = null
    })

    return pendingRef.current
  }, [])

  /* A point the visitor placed on the map, or null to go back to the device.
     Stored so a wrong fix does not come back on the next visit. */
  const setManualLocation = useCallback(
    (fix: { lat: number; lng: number } | null) => {
      if (!fix) {
        manualRef.current = null
        void AsyncStorage.removeItem(MANUAL_LOCATION_KEY).catch(() => {})
        setManualLocationState(null)
        setStatus("idle")
        void request()
        return
      }

      const next: UserLocation = {
        latitude: fix.lat,
        longitude: fix.lng,
        accuracy: null,
      }

      manualRef.current = next
      void AsyncStorage.setItem(
        MANUAL_LOCATION_KEY,
        JSON.stringify({
          latitude: next.latitude,
          longitude: next.longitude,
        }),
      ).catch(() => {})
      setManualLocationState(next)
      setStatus("manual")
    },
    [request],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /* Adopt a stored choice before the auto-request effect runs, so a reload
     does not first prompt and jump the map to a place already corrected. */
  useEffect(() => {
    let cancelled = false

    AsyncStorage.getItem(MANUAL_LOCATION_KEY)
      .then((raw) => {
        if (cancelled || !raw) return

        const parsed: unknown = JSON.parse(raw)
        if (typeof parsed !== "object" || parsed === null) return

        const { latitude, longitude } = parsed as {
          latitude?: unknown
          longitude?: unknown
        }
        if (
          typeof latitude !== "number" ||
          typeof longitude !== "number" ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return
        }

        const next: UserLocation = { latitude, longitude, accuracy: null }
        manualRef.current = next
        setManualLocationState(next)
        setStatus("manual")
      })
      .catch(() => {
        // Private mode, a disabled store or corrupt JSON: fall back to the device.
      })
      .finally(() => {
        if (!cancelled) setIsHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Wait for the stored choice before asking, so a manual point is not
    // immediately overwritten by a prompt the visitor already answered.
    if (!requestOnMount || !isHydrated || autoRequestedRef.current) return
    autoRequestedRef.current = true
    void request()
  }, [requestOnMount, isHydrated, request])

  return {
    /** The chosen point if there is one, otherwise the device's fix. */
    location: manualLocation ?? gpsLocation,
    status,
    request,
    isManual: manualLocation !== null,
    setManualLocation,
  }
}
