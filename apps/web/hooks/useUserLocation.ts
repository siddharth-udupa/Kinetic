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

/* The tab keeps its last fix for as long as it lives. Holding it here means a
   remount of the screen — the loop builder's nav entry remounts `/maps` — opens
   on the athlete instead of falling back to the provider's city while the
   browser works out a fresh position. */
let lastFix: UserLocation | null = null

/* A browser fix is only as good as the platform behind it: on a desktop with no
   GPS and no Wi-Fi lookup it is an IP guess that can land in the wrong city.
   The start point a visitor places on the map is therefore persisted, so their
   correction survives reloads instead of being replaced by the same bad guess. */
const MANUAL_LOCATION_KEY = "kinetic:start-location"

/* A laptop rarely has a GPS, so the first answer is often a coarse network fix
   that the platform then refines. `watchPosition` is what keeps those
   refinements coming: a single `getCurrentPosition` shot that timed out used to
   leave the map on the provider's default city (Bangalore) even though the
   browser was still perfectly able to answer a moment later. */
const FIX_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  // A fix from the last half minute is enough to draw the map at once; the
  // watch still replaces it with a fresh one, so this never pins a stale spot.
  maximumAge: 30_000,
}

/* A caller waiting on `request` (the loop builder's submit) should not hang if
   the platform is slow. The watch keeps running past this, so a later fix still
   reaches the map even after the promise has resolved without one. */
const REQUEST_DEADLINE_MS = 15_000

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
 * The position is watched rather than sampled once: the first fix the platform
 * offers is frequently coarse, and a watch keeps correcting it for as long as
 * the screen is mounted. A timeout or a temporarily unavailable position is not
 * the end of the attempt — the watch retries on its own, so the map can still
 * land on the athlete after the loop builder has given up waiting.
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
  const [gpsLocation, setGpsLocation] = useState<UserLocation | null>(
    () => lastFix,
  )
  const [manualLocation, setManualLocationState] =
    useState<UserLocation | null>(null)
  const [status, setStatus] = useState<LocationStatus>(() =>
    lastFix ? "granted" : "idle",
  )

  /* Local storage is read after mount, not during render: the server cannot see
     it and the first client render must match what the server sent. */
  const manualRef = useRef<UserLocation | null>(null)
  const mountedRef = useRef(true)
  const locationRef = useRef<UserLocation | null>(lastFix)
  const watchIdRef = useRef<number | null>(null)
  const pendingRef = useRef<Promise<UserLocation | null> | null>(null)
  const settleRef = useRef<((fix: UserLocation | null) => void) | null>(null)
  const deadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopWatch = useCallback(() => {
    if (watchIdRef.current === null) return
    navigator.geolocation?.clearWatch(watchIdRef.current)
    watchIdRef.current = null
  }, [])

  /* Resolves the one in-flight request, if any, and cancels its deadline. */
  const settle = useCallback((fix: UserLocation | null) => {
    if (deadlineRef.current !== null) {
      clearTimeout(deadlineRef.current)
      deadlineRef.current = null
    }

    const resolve = settleRef.current
    settleRef.current = null
    resolve?.(fix)
  }, [])

  const applyFix = useCallback(
    (position: GeolocationPosition) => {
      const next = toUserLocation(position)
      lastFix = next
      locationRef.current = next

      // A chosen point outranks the browser's answer for as long as it is set.
      if (manualRef.current) return
      if (!mountedRef.current) return

      setGpsLocation(next)
      setStatus("granted")
      settle(next)
    },
    [settle],
  )

  const handleError = useCallback(
    (error: GeolocationPositionError) => {
      const nextStatus = statusForError(error)

      // Neither a refusal nor an unsupported platform will ever answer this
      // watch, so stop it and let the UI offer its retry.
      if (nextStatus === "denied" || nextStatus === "unsupported") {
        stopWatch()
        if (!mountedRef.current) return
        setStatus(nextStatus)
        settle(null)
        return
      }

      // Both the other cases are transient and the watch retries by itself.
      // Keep a fix we already have rather than flashing an error over it.
      if (locationRef.current) return
      if (mountedRef.current) setStatus(nextStatus)
    },
    [settle, stopWatch],
  )

  const startWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (mountedRef.current) setStatus("unsupported")
      settle(null)
      return
    }

    if (watchIdRef.current !== null) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      applyFix,
      handleError,
      FIX_OPTIONS,
    )
  }, [applyFix, handleError, settle])

  const request = useCallback((): Promise<UserLocation | null> => {
    // The visitor's own choice is already a valid start point; never replace it
    // with the browser's guess just because something asked to locate.
    if (manualRef.current) return Promise.resolve(manualRef.current)

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported")
      return Promise.resolve(null)
    }

    // Start (or restart) the watch even when a fix is already known: the whole
    // point is that it keeps refining the position the screen is showing.
    startWatch()

    if (locationRef.current) return Promise.resolve(locationRef.current)

    // Every caller shares the one in-flight fix, so a route request that lands
    // while the page-load prompt is still open waits for the same answer.
    if (pendingRef.current) return pendingRef.current

    setStatus((current) => (current === "granted" ? current : "requesting"))

    const pending = new Promise<UserLocation | null>((resolve) => {
      settleRef.current = resolve

      /* The platform has given neither a fix nor an error. Resolve the caller
         without one, but leave the watch running: a position that arrives after
         this still updates the map. */
      deadlineRef.current = setTimeout(() => {
        deadlineRef.current = null
        settleRef.current = null
        if (mountedRef.current) {
          setStatus((current) => (current === "granted" ? current : "timeout"))
        }
        resolve(null)
      }, REQUEST_DEADLINE_MS)
    })

    pendingRef.current = pending.finally(() => {
      pendingRef.current = null
    })

    return pendingRef.current
  }, [startWatch])

  /* A point the visitor placed on the map, or null to go back to the browser.
     Stored so a wrong browser fix does not come back on the next visit. */
  const setManualLocation = useCallback(
    (fix: { lat: number; lng: number } | null) => {
      if (!fix) {
        manualRef.current = null
        storeLocation(null)
        setManualLocationState(null)
        setStatus(locationRef.current ? "granted" : "idle")
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

      // The browser has nothing to add while a chosen point is in force, and
      // keeping a GPS watch alive would only burn battery.
      stopWatch()
      settle(next)
    },
    [request, settle, stopWatch],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopWatch()
      // A caller awaiting a fix must not be left hanging on unmount.
      settle(null)
    }
  }, [settle, stopWatch])

  /* Adopt a stored choice before the auto-request effect runs, so a reload does
     not first prompt and jump the map to a city the visitor already corrected. */
  useEffect(() => {
    const stored = readStoredLocation()
    if (!stored) return

    manualRef.current = stored
    setManualLocationState(stored)
    setStatus("manual")
    stopWatch()
  }, [stopWatch])

  useEffect(() => {
    if (!requestOnMount) return
    /* Deliberately unconditional rather than guarded by a "asked once" ref:
       Strict Mode runs this effect, cleans it up and runs it again, so a guard
       would leave the second pass with a watch the cleanup already stopped.
       `request` is idempotent — it reuses a running watch and a known fix. */
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
