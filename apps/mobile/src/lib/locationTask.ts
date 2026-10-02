import { Platform } from "react-native"
import { appendPointsToActiveSession, isValidLocationPoint } from "./activeSessionStorage"
import { type LocationTaskOptions } from "expo-location"
import type { ActivityPoint } from "@repo/types"
import { COLORS } from "@repo/shared"

export const LOCATION_TASK_NAME = "activity-location-task"

// ---------------------------------------------------------------------------
// Pub/sub for live GPS updates
// ---------------------------------------------------------------------------
type LocationListener = (point: ActivityPoint) => void
const listeners = new Set<LocationListener>()

/** Subscribe to live GPS updates received by the background location task. */
export function subscribeToLocationUpdates(listener: LocationListener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export { isValidLocationPoint }

// ---------------------------------------------------------------------------
// Native modules (optional — guarded by try/catch)
// ---------------------------------------------------------------------------
let TaskManager: typeof import("expo-task-manager") | null = null
let Location: typeof import("expo-location") | null = null

try {
  TaskManager = require("expo-task-manager")
  Location = require("expo-location")
} catch {
  // Native modules unavailable — background tracking won't work
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

// ---------------------------------------------------------------------------
// Background location lifecycle
// ---------------------------------------------------------------------------

/** Stop any stale/orphaned background location task on startup. */
export async function cleanupStaleLocationTasks(): Promise<void> {
  if (!Location?.hasStartedLocationUpdatesAsync) return
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
    if (isRunning && Location.stopLocationUpdatesAsync) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
  } catch {
    // Silently ignore — cleanup is best-effort
  }
}

/** Start background location tracking with Android foreground service. */
export async function startBackgroundLocationTask(): Promise<boolean> {
  if (!Location?.requestBackgroundPermissionsAsync) return false

  try {
    // Check TaskManager availability
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

// ---------------------------------------------------------------------------
// Background task definition
// ---------------------------------------------------------------------------
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
    // defineTask registration failed — background tracking unavailable
  }
}
