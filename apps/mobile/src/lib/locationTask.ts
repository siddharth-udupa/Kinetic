import { Platform } from "react-native"
import { appendPointsToActiveSession, isValidLocationPoint } from "./activeSessionStorage"
import { type LocationTaskOptions } from "expo-location"
import type { ActivityPoint } from "@repo/types"
import { COLORS } from "@repo/shared"

export const LOCATION_TASK_NAME = "activity-location-task"

type LocationListener = (point: ActivityPoint) => void
const listeners = new Set<LocationListener>()

/** Subscribe to live GPS updates received by the background location task. */
export function subscribeToLocationUpdates(listener: LocationListener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export { isValidLocationPoint }

let TaskManager: typeof import("expo-task-manager") | null = null
let Location: typeof import("expo-location") | null = null

try {
  TaskManager = require("expo-task-manager")
  Location = require("expo-location")
} catch {
  // expo-location is an optional native module. Fail soft so the web build
  // works without it and foreground tracking still runs.
}

/** Convert raw location coords into an ActivityPoint. */
function coordsToPoint(coords: any, timestamp: number): ActivityPoint {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitude: coords.altitude ?? null,
    speed: coords.speed ?? null,
    accuracy: coords.accuracy ?? null,
    timestamp,
  }
}

/** Read the device's current position using expo-location or web geolocation. */
export function getCurrentPosition(): Promise<ActivityPoint | null> {
  return new Promise((resolve) => {
    if (Location && typeof Location.getCurrentPositionAsync === "function") {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((loc) => resolve(loc?.coords ? coordsToPoint(loc.coords, loc.timestamp) : null))
        .catch(() => resolve(null))
    } else if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(coordsToPoint(pos.coords, pos.timestamp)),
        () => resolve(null),
        { enableHighAccuracy: true },
      )
    } else {
      resolve(null)
    }
  })
}

/** Current position only when permission has already been granted. Never prompts,
 *  so screens that merely want to follow the athlete can call it safely. */
export async function getCurrentPositionIfPermitted(): Promise<ActivityPoint | null> {
  if (Platform.OS !== "web") {
    if (!Location || typeof Location.getForegroundPermissionsAsync !== "function") return null

    try {
      const permission = await Location.getForegroundPermissionsAsync()
      if (permission.status !== "granted") return null
      return await getCurrentPosition()
    } catch {
      return null
    }
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) return null

  // `getCurrentPosition` prompts while the state is undetermined, so read the
  // Permissions API first and keep the caller's default when it is not granted.
  try {
    const permission = await navigator.permissions?.query({ name: "geolocation" })
    if (permission?.state !== "granted") return null
  } catch {
    return null
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(coordsToPoint(pos.coords, pos.timestamp)),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  })
}

/** Stop any stale/orphaned background location task on startup. */
export async function cleanupStaleLocationTasks(): Promise<void> {
  if (!Location?.hasStartedLocationUpdatesAsync) return
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
    if (isRunning && Location.stopLocationUpdatesAsync) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
  } catch {
    // Silently ignored: a stale task is not worth failing startup over.
  }
}

/** Start background location tracking. Needs a registered foreground task: Android runs it in the
 *  foreground service configured below, iOS in the background location mode. */
export async function startBackgroundLocationTask(): Promise<boolean> {
  if (!Location?.requestBackgroundPermissionsAsync) return false

  try {
    const isTaskAvailable = typeof (Location as any)?.isTaskManagerAvailableAsync === "function"
      ? await (Location as any).isTaskManagerAvailableAsync()
      : true
    if (!isTaskAvailable) return false

    const bgPerm = await Location.requestBackgroundPermissionsAsync()
    if (bgPerm.status !== "granted") return false

    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
    if (!isRunning) {
      const taskOptions: LocationTaskOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 2,
        deferredUpdatesInterval: 2000,
        deferredUpdatesDistance: 2,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
      }

      if (Platform.OS === "android") {
        taskOptions.foregroundService = {
          notificationTitle: "Recording Activity",
          notificationBody: "Kinetic is recording your route in the background.",
          notificationColor: COLORS.light.accent,
        }
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, taskOptions)
    }

    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  } catch (err) {
    console.error("[LOCATION_TASK] Error starting background task:", err)
    return false
  }
}

/** Stop background location tracking if active. */
export async function stopBackgroundLocationTask(): Promise<void> {
  if (!Location?.hasStartedLocationUpdatesAsync) return
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
    if (isRunning && Location.stopLocationUpdatesAsync) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
  } catch (err) {
    console.error("[LOCATION_TASK] Error stopping background task:", err)
  }
}

if (TaskManager?.defineTask) {
  try {
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
      if (error) {
        console.error("[LOCATION_TASK] Task error:", error)
        return
      }
      if (!data) return

      try {
        const { locations } = data as { locations: any[] }
        if (!Array.isArray(locations)) return

        const validPoints: ActivityPoint[] = []
        for (const loc of locations) {
          if (!loc?.coords) continue
          const point = coordsToPoint(loc.coords, loc.timestamp)
          if (isValidLocationPoint(point)) {
            validPoints.push(point)
            listeners.forEach((fn) => {
              fn(point)
            })
          }
        }

        if (validPoints.length > 0) {
          await appendPointsToActiveSession(validPoints)
        }
      } catch (err) {
        console.error("[LOCATION_TASK] Error processing location payload:", err)
      }
    })
  } catch {
    // A repeat registration throws here, so this only ever fails once.
    // Background tracking is unavailable either way.
  }
}
