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
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported"

type UseUserLocationOptions = {
  /** Ask for permission as soon as the component mounts. */
  requestOnMount?: boolean
}

function statusForError(error: GeolocationPositionError): LocationStatus {
  if (error.code === error.PERMISSION_DENIED) return "denied"
  if (error.code === error.TIMEOUT) return "timeout"
  return "unavailable"
}

/**
 * One precise fix for the screens that need to start at the athlete, with the
 * permission outcome kept as state so the UI can ask again after a refusal.
 *
 * The browser only prompts while permission is undecided, so `request` doubles
 * as the retry action: after a denial it resolves to null immediately until the
 * visitor changes the site permission.
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

          const next: UserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : null,
          }

          setLocation(next)
          setStatus("granted")
          resolve(next)
        },
        (error) => {
          if (mountedRef.current) setStatus(statusForError(error))
          resolve(null)
        },
        // A fresh, high-accuracy fix: the loop starts from this point, so a
        // cached or coarse city-level position would put the route elsewhere.
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      )
    })

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
