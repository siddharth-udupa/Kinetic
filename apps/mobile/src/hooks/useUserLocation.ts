import { useCallback, useEffect, useRef, useState } from "react"
import { Platform } from "react-native"

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
 */
export function useUserLocation({
  requestOnMount = false,
}: UseUserLocationOptions = {}) {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [status, setStatus] = useState<LocationStatus>("idle")

  const mountedRef = useRef(true)
  const pendingRef = useRef<Promise<UserLocation | null> | null>(null)
  const autoRequestedRef = useRef(false)

  const request = useCallback((): Promise<UserLocation | null> => {
    // Every caller shares the one in-flight fix, so a route request that lands
    // while the page-load prompt is still open waits for the same answer.
    if (pendingRef.current) return pendingRef.current

    const settle = (
      next: UserLocation | null,
      nextStatus: LocationStatus,
    ): UserLocation | null => {
      if (!mountedRef.current) return null
      if (next) setLocation(next)
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

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!requestOnMount || autoRequestedRef.current) return
    autoRequestedRef.current = true
    void request()
  }, [requestOnMount, request])

  return { location, status, request }
}
