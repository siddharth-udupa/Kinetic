import { useState, useEffect, useRef, useCallback } from "react"
import { AppState, type AppStateStatus } from "react-native"
import {
  getCurrentPosition,
  isValidLocationPoint,
  subscribeToLocationUpdates,
  startBackgroundLocationTask,
  stopBackgroundLocationTask,
} from "../lib/locationTask"
import { saveActivityLocally } from "../lib/activityStorage"
import {
  type ActiveSession,
  createActiveSession,
  getActiveSession,
  appendPointsToActiveSession,
  pauseActiveSession,
  resumeActiveSession,
  clearActiveSession,
  computeElapsedSeconds,
} from "../lib/activeSessionStorage"
import type { ActivitySummary, ActivityPoint, ActivityTypes } from "@repo/types"
import { authClient } from "../lib/auth-client"

let Location: typeof import("expo-location") | null = null
try {
  Location = require("expo-location")
} catch {
  // expo-location is an optional native module. Without it, web geolocation is used.
}

export type RecorderState = "idle" | "recording" | "paused" | "finished"
export type LocationStatus = "acquiring" | "acquired" | "disabled" | "denied"

type RecorderData = {
  status: RecorderState
  locationStatus: LocationStatus
  currentPoint: ActivityPoint | null
  points: ActivityPoint[]
  distanceMeters: number
  elapsedSeconds: number
  currentSpeedMps: number
  maxSpeedMps: number
  isBackgroundActive: boolean
  errorMsg: string | null
}

const INITIAL_DATA: RecorderData = {
  status: "idle",
  locationStatus: "acquiring",
  currentPoint: null,
  points: [],
  distanceMeters: 0,
  elapsedSeconds: 0,
  currentSpeedMps: 0,
  maxSpeedMps: 0,
  isBackgroundActive: false,
  errorMsg: null,
}

/** Convert raw coords (from expo-location or web geolocation) into an ActivityPoint. */
function coordsToPoint(coords: { latitude: number; longitude: number; altitude?: number | null; speed?: number | null; accuracy?: number | null }, timestamp: number): ActivityPoint {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitude: coords.altitude ?? null,
    speed: coords.speed ?? null,
    accuracy: coords.accuracy ?? null,
    timestamp,
  }
}

const hasExpoLocation = Boolean(Location && typeof Location.requestForegroundPermissionsAsync === "function")
const hasWebGeolocation = typeof navigator !== "undefined" && !!navigator.geolocation
const isLocationAvailable = hasExpoLocation || hasWebGeolocation

const API_URL = process.env.EXPO_PUBLIC_API_URL!

export function useActivityRecorder(activityType: ActivityTypes) {
  const [data, setData] = useState<RecorderData>(INITIAL_DATA)
  const sessionRef = useRef<ActiveSession | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fgSubRef = useRef<{ remove: () => void } | null>(null)
  const webWatchRef = useRef<number | null>(null)

  const requestLocationPermissions = useCallback(async (): Promise<boolean> => {
    setData((prev) => ({ ...prev, locationStatus: "acquiring", errorMsg: null }))

    if (hasExpoLocation && Location) {
      try {
        const checkEnabled = (Location as any).hasServicesEnabledAsync || (Location as any).isLocationEnabledAsync
        if (typeof checkEnabled === "function") {
          const isEnabled = await checkEnabled.call(Location)
          if (!isEnabled) {
            setData((prev) => ({
              ...prev,
              locationStatus: "disabled",
              errorMsg: "Location services are turned off on your device.",
            }))
            return false
          }
        }

        const fgPerm = await Location.requestForegroundPermissionsAsync()
        if (fgPerm.status !== "granted") {
          setData((prev) => ({
            ...prev,
            locationStatus: "denied",
            errorMsg: "Foreground location permission is required.",
          }))
          return false
        }

        if (typeof Location.requestBackgroundPermissionsAsync === "function") {
          try {
            await Location.requestBackgroundPermissionsAsync()
          } catch {
            // A rejected background prompt is fine: foreground is granted.
          }
        }

        const initialPos = await getCurrentPosition()
        setData((prev) => ({
          ...prev,
          locationStatus: "acquired",
          currentPoint: initialPos || prev.currentPoint,
        }))
        return true
      } catch (err: any) {
        console.error("Location permission error:", err)
        setData((prev) => ({
          ...prev,
          locationStatus: "disabled",
          errorMsg: err.message || "Failed to access location services.",
        }))
        return false
      }
    } else if (hasWebGeolocation) {
      return new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const point = coordsToPoint(pos.coords, pos.timestamp)
            setData((prev) => ({
              ...prev,
              locationStatus: "acquired",
              currentPoint: point,
            }))
            resolve(true)
          },
          (err) => {
            const isDenied = err.code === err.PERMISSION_DENIED
            setData((prev) => ({
              ...prev,
              locationStatus: isDenied ? "denied" : "disabled",
              errorMsg: isDenied
                ? "Location permission denied."
                : "Location service turned off.",
            }))
            resolve(false)
          },
          { enableHighAccuracy: true, timeout: 15000 }
        )
      })
    } else {
      setData((prev) => ({
        ...prev,
        locationStatus: "disabled",
        errorMsg: "Location services are unavailable on this device or build.",
      }))
      return false
    }
  }, [])

  useEffect(() => {
    requestLocationPermissions()
  }, [requestLocationPermissions])

  const syncFromSession = useCallback((session: ActiveSession) => {
    sessionRef.current = session
    setData((prev) => ({
      ...prev,
      status: session.status,
      points: session.points,
      distanceMeters: session.distanceMeters,
      currentSpeedMps: session.currentSpeedMps,
      maxSpeedMps: session.maxSpeedMps,
      isBackgroundActive: session.isBackgroundActive,
      elapsedSeconds: computeElapsedSeconds(session),
    }))
  }, [])

  // The background task may have appended points while the app was closed.
  useEffect(() => {
    let mounted = true
    getActiveSession().then((session) => {
      if (mounted && session) syncFromSession(session)
    })
    return () => { mounted = false }
  }, [syncFromSession])

  useEffect(() => {
    const onAppState = async (state: AppStateStatus) => {
      if (state === "active") {
        const session = await getActiveSession()
        if (session) syncFromSession(session)
      }
    }
    const sub = AppState.addEventListener("change", onAppState)
    return () => sub.remove()
  }, [syncFromSession])

  useEffect(() => {
    if (data.status !== "recording" && data.status !== "paused") {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      const s = sessionRef.current
      if (s) setData((prev) => ({ ...prev, elapsedSeconds: computeElapsedSeconds(s) }))
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [data.status])

  const handleLivePoint = useCallback((point: ActivityPoint) => {
    if (!isValidLocationPoint(point)) return

    setData((prev) => ({
      ...prev,
      currentPoint: point,
      locationStatus: "acquired",
      points: prev.status === "recording" ? [...prev.points, point] : prev.points,
      currentSpeedMps: point.speed !== null && point.speed >= 0 ? point.speed : prev.currentSpeedMps,
      maxSpeedMps: point.speed !== null && point.speed >= 0 ? Math.max(prev.maxSpeedMps, point.speed) : prev.maxSpeedMps,
    }))

    // The background task may have appended points; the ticker reads this ref.
    getActiveSession().then((session) => {
      if (session) {
        sessionRef.current = session
        setData((prev) => ({ ...prev, distanceMeters: session.distanceMeters }))
      }
    })
  }, [])

  useEffect(() => {
    if (data.status !== "recording") {
      if (fgSubRef.current) { fgSubRef.current.remove(); fgSubRef.current = null }
      if (webWatchRef.current !== null && hasWebGeolocation) {
        navigator.geolocation.clearWatch(webWatchRef.current)
        webWatchRef.current = null
      }
      return
    }

    // The background task is what keeps the UI live while the app is backgrounded.
    const unsubBg = subscribeToLocationUpdates(handleLivePoint)

    if (data.isBackgroundActive) {
      return () => unsubBg()
    }

    if (Location && typeof Location.watchPositionAsync === "function") {
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
        async (loc) => {
          if (!loc?.coords) return
          const point = coordsToPoint(loc.coords, loc.timestamp)
          handleLivePoint(point)
          await appendPointsToActiveSession([point])
        },
      )
        .then((sub) => { fgSubRef.current = sub })
        .catch(() => { })
    } else if (hasWebGeolocation) {
      webWatchRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const point = coordsToPoint(pos.coords, pos.timestamp)
          handleLivePoint(point)
          await appendPointsToActiveSession([point])
        },
        () => { },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 },
      )
    }

    return () => {
      unsubBg()
      if (fgSubRef.current) { fgSubRef.current.remove(); fgSubRef.current = null }
      if (webWatchRef.current !== null && hasWebGeolocation) {
        navigator.geolocation.clearWatch(webWatchRef.current)
        webWatchRef.current = null
      }
    }
  }, [data.status, data.isBackgroundActive, handleLivePoint])

  const startRecording = async () => {
    try {
      setData((prev) => ({ ...prev, errorMsg: null }))

      const granted = await requestLocationPermissions()
      if (!granted) return

      // Background tracking is best-effort: recording proceeds without it.
      let bgActive = false
      try { bgActive = await startBackgroundLocationTask() } catch { }

      const session = await createActiveSession(activityType, bgActive)
      sessionRef.current = session
      setData((prev) => ({ ...prev, status: "recording", isBackgroundActive: bgActive }))

      const initialPoint = await getCurrentPosition()
      if (initialPoint) {
        handleLivePoint(initialPoint)
        await appendPointsToActiveSession([initialPoint])
      }
    } catch (err: any) {
      console.error("Start activity error:", err)
      setData((prev) => ({ ...prev, errorMsg: err.message || "Failed to start recording." }))
    }
  }

  const pauseRecording = async () => {
    const session = await pauseActiveSession()
    if (session) syncFromSession(session)
    else setData((prev) => ({ ...prev, status: "paused" }))
  }

  const resumeRecording = async () => {
    const session = await resumeActiveSession()
    if (session) syncFromSession(session)
    else setData((prev) => ({ ...prev, status: "recording" }))
  }

  const finishRecordingSession = async () => {
    try {
      setData((prev) => ({ ...prev, status: "finished" }))
      await stopBackgroundLocationTask()
      const session = (await getActiveSession()) || sessionRef.current
      return session
    } catch (err: any) {
      console.error("Finish activity session error:", err)
      setData((prev) => ({ ...prev, errorMsg: "Error finishing activity recording." }))
      return null
    }
  }

  const saveRecordedActivity = async (customDetails?: {
    title?: string
    description?: string
    activityType?: ActivityTypes
  }): Promise<ActivitySummary | null> => {
    try {
      await stopBackgroundLocationTask()

      const session = (await getActiveSession()) || sessionRef.current
      const finalPoints = session?.points || data.points
      const finalDistance = session?.distanceMeters || data.distanceMeters
      const finalDuration = session ? computeElapsedSeconds(session) : data.elapsedSeconds
      const finalMaxSpeed = session?.maxSpeedMps || data.maxSpeedMps
      const selectedType = customDetails?.activityType || session?.type || activityType

      const defaultTitle = selectedType === "run" ? "Morning Run" : selectedType === "ride" ? "Ride" : "Activity"

      const summary: ActivitySummary = {
        id: session?.id || `act_${Date.now()}`,
        type: selectedType as any,
        title: customDetails?.title?.trim() || defaultTitle,
        description: customDetails?.description?.trim() || undefined,
        startedAt: session?.startedAt || Date.now(),
        endedAt: Date.now(),
        distanceMeters: finalDistance,
        durationSeconds: finalDuration,
        movingTimeSeconds: finalDuration,
        avgSpeedMps: finalDuration > 0 ? finalDistance / finalDuration : 0,
        maxSpeedMps: finalMaxSpeed,
        points: finalPoints,
      }

      await saveActivityLocally(summary)

      try {
        await authClient.$fetch(`${API_URL}/api/activities`, {
          method: "POST",
          body: { source: "mobile", data: summary },
        })
      } catch {
        console.warn("Failed to post activity to server")
      }

      await clearActiveSession()
      sessionRef.current = null
      setData((prev) => ({ ...INITIAL_DATA, locationStatus: prev.locationStatus, currentPoint: prev.currentPoint }))

      return summary
    } catch (err: any) {
      console.error("Save activity error:", err)
      setData((prev) => ({ ...prev, errorMsg: "Error saving activity recording." }))
      return null
    }
  }

  const discardRecordingSession = async (): Promise<void> => {
    try {
      await stopBackgroundLocationTask()
      await clearActiveSession()
      sessionRef.current = null
      setData((prev) => ({ ...INITIAL_DATA, locationStatus: prev.locationStatus, currentPoint: prev.currentPoint }))
    } catch (err: any) {
      console.error("Discard activity error:", err)
    }
  }

  const stopAndSaveRecording = async (): Promise<ActivitySummary | null> => {
    await finishRecordingSession()
    return saveRecordedActivity()
  }

  return {
    status: data.status,
    locationStatus: data.locationStatus,
    currentPoint: data.currentPoint,
    points: data.points,
    distanceMeters: data.distanceMeters,
    elapsedSeconds: data.elapsedSeconds,
    currentSpeedMps: data.currentSpeedMps,
    maxSpeedMps: data.maxSpeedMps,
    isBackgroundActive: data.isBackgroundActive,
    errorMsg: data.errorMsg,
    isNativeSupported: isLocationAvailable,
    requestLocationPermissions,
    startRecording,
    pauseRecording,
    resumeRecording,
    finishRecordingSession,
    saveRecordedActivity,
    discardRecordingSession,
    stopAndSaveRecording,
  }
}

