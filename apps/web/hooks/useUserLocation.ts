"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type UserLocation = {
  lat: number
  lng: number
  /** Horizontal accuracy in metres, as reported by the browser. */
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

/** Above this the browser's answer is a city-level guess, not a position to
 *  start a loop from — typically an IP lookup rather than a Wi-Fi/GPS fix. */
export const APPROXIMATE_ACCURACY_METRES = 1_000

export function isApproximateFix(location: UserLocation | null): boolean {
  return (
    location !== null &&
    (location.accuracy === null ||
      location.accuracy > APPROXIMATE_ACCURACY_METRES)
  )
}

/* A browser fix is only as good as the platform behind it: on a desktop with no
   GPS and no Wi-Fi lookup it is an IP guess that can land in the wrong city.
   The start point a visitor places on the map is therefore persisted, so their
   correction survives reloads instead of being replaced by the same bad guess. */
const MANUAL_LOCATION_KEY = "kinetic:start-location"

/* A fresh, high-accuracy fix: the loop starts from this point, so a cached or
   coarse city-level position would put the route elsewhere. `maximumAge: 0` is
   deliberate — a watched or cached fix can be an IP-level guess hundreds of
   kilometres out, which is exactly what made `/maps` land in the wrong city. */
const FIX_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
}

function statusForError(error: GeolocationPositionError): LocationStatus {
  if (error.code === error.PERMISSION_DENIED) return "denied"
  if (error.code === error.TIMEOUT) return "timeout"
  return "unavailable"
}

function toUserLocation(position: GeolocationPosition): UserLocation {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: Number.isFinite(position.coords.accuracy)
      ? position.coords.accuracy
      : null,
  }
}

function readStoredLocation(): UserLocation | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(MANUAL_LOCATION_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return null

    const { lat, lng } = parsed as { lat?: unknown; lng?: unknown }
    if (typeof lat !== "number" || typeof lng !== "number") return null
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    return { lat, lng, accuracy: null }
  } catch {
    // Private mode, a disabled store or corrupt JSON: fall back to the browser.
    return null
  }
}

function storeLocation(location: UserLocation | null) {
  if (typeof window === "undefined") return

  try {
    if (location) {
      window.localStorage.setItem(
        MANUAL_LOCATION_KEY,
        JSON.stringify({ lat: location.lat, lng: location.lng }),
      )
    } else {
      window.localStorage.removeItem(MANUAL_LOCATION_KEY)
    }
  } catch {
    // Storing is a convenience; the in-memory choice still works this session.
  }
}

/**
 * The athlete's position for the screens that need to start at them, with the
 * permission outcome kept as state so the UI can ask again after a refusal.
 *
 * Every request asks the browser for one fresh, high-accuracy fix rather than
 * reusing the tab's last answer or a cached one. That is what `/maps/route`
 * did while its location was correct, and the difference matters: a cached or
 * watched answer can be a coarse network guess that is hundreds of kilometres
 * off, and the loop is anchored to this point.
 *
 * The browser only prompts while permission is undecided, so `request` doubles
 * as the retry action: after a denial it resolves to null immediately until the
 * visitor changes the site permission.
 *
 * A browser fix can still be wrong — a laptop without GPS or Wi-Fi lookup gets
 * an IP guess that lands in another city. `setManualLocation` therefore lets the
 * map override it with a point the visitor chose, and that choice is remembered
 * until they ask for the browser location again.
 */
export function useUserLocation({
  requestOnMount = false,
}: UseUserLocationOptions = {}) {
  const [gpsLocation, setGpsLocation] = useState<UserLocation | null>(null)
  const [manualLocation, setManualLocationState] =
    useState<UserLocation | null>(null)
  const [status, setStatus] = useState<LocationStatus>("idle")

  /* Local storage is read after mount, not during render: the server cannot see
     it and the first client render must match what the server sent. */
  const manualRef = useRef<UserLocation | null>(null)
  const mountedRef = useRef(true)
  const pendingRef = useRef<Promise<UserLocation | null> | null>(null)

  const request = useCallback((): Promise<UserLocation | null> => {
    // The visitor's own choice is already a valid start point; never replace it
    // with the browser's guess just because something asked to locate.
    if (manualRef.current) return Promise.resolve(manualRef.current)

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported")
      return Promise.resolve(null)
    }

    // Every caller shares the one in-flight fix, so a route request that lands
    // while the page-load prompt is still open waits for the same answer.
    if (pendingRef.current) return pendingRef.current

    setStatus((current) => (current === "granted" ? current : "requesting"))

    const pending = new Promise<UserLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!mountedRef.current) {
            resolve(null)
            return
          }

          // A point chosen while the browser was answering outranks the fix.
          if (manualRef.current) {
            resolve(manualRef.current)
            return
          }

          const next = toUserLocation(position)
          setGpsLocation(next)
          setStatus("granted")
          resolve(next)
        },
        (error) => {
          if (mountedRef.current) setStatus(statusForError(error))
          resolve(null)
        },
        FIX_OPTIONS,
      )
    })

    pendingRef.current = pending.finally(() => {
      pendingRef.current = null
    })

    return pendingRef.current
  }, [])

  /* A point the visitor placed on the map, or null to go back to the browser.
     Stored so a wrong browser fix does not come back on the next visit. */
  const setManualLocation = useCallback(
    (fix: { lat: number; lng: number } | null) => {
      if (!fix) {
        manualRef.current = null
        storeLocation(null)
        setManualLocationState(null)
        setStatus("idle")
        void request()
        return
      }

      const next: UserLocation = {
        lat: fix.lat,
        lng: fix.lng,
        accuracy: null,
      }

      manualRef.current = next
      storeLocation(next)
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

  /* Adopt a stored choice before the auto-request effect runs, so a reload does
     not first prompt and jump the map to a city the visitor already corrected. */
  useEffect(() => {
    const stored = readStoredLocation()
    if (!stored) return

    manualRef.current = stored
    setManualLocationState(stored)
    setStatus("manual")
  }, [])

  useEffect(() => {
    if (!requestOnMount) return
    /* Deliberately unconditional rather than guarded by an "asked once" ref:
       Strict Mode runs this effect, cleans it up and runs it again, so a guard
       would leave the second pass without a request. `request` is idempotent —
       it reuses an in-flight fix. */
    void request()
  }, [requestOnMount, request])

  return {
    /** The chosen point if there is one, otherwise the browser's fix. */
    location: manualLocation ?? gpsLocation,
    status,
    request,
    isManual: manualLocation !== null,
    setManualLocation,
  }
}
