import AsyncStorage from "@react-native-async-storage/async-storage"
import { haversineDistance } from "@repo/gpx"
import type { ActivityPoint, ActivityTypes } from "@repo/types"

export function isValidLocationPoint(point: ActivityPoint): boolean {
  if (point.accuracy !== null && point.accuracy > 100) return false
  if (point.latitude === 0 && point.longitude === 0) return false
  return true
}

export type ActiveSessionStatus = "recording" | "paused"

export type ActiveSession = {
  id: string
  type: ActivityTypes
  status: ActiveSessionStatus
  startedAt: number
  pausedAt: number | null
  totalPausedMs: number
  distanceMeters: number
  currentSpeedMps: number
  maxSpeedMps: number
  points: ActivityPoint[]
  isBackgroundActive: boolean
}

const ACTIVE_SESSION_KEY = "@strava_clone_active_session_v1"

export async function createActiveSession(
  type: ActivityTypes = "run",
  isBackgroundActive: boolean = false
): Promise<ActiveSession> {
  const session: ActiveSession = {
    id: `act_${Date.now()}`,
    type,
    status: "recording",
    startedAt: Date.now(),
    pausedAt: null,
    totalPausedMs: 0,
    distanceMeters: 0,
    currentSpeedMps: 0,
    maxSpeedMps: 0,
    points: [],
    isBackgroundActive,
  }

  try {
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session))
  } catch (err) {
    console.error("[activeSessionStorage] Failed to save initial active session:", err)
  }

  return session
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ActiveSession
  } catch (err) {
    console.error("[activeSessionStorage] Failed to load active session:", err)
    return null
  }
}

export async function appendPointsToActiveSession(
  newPoints: ActivityPoint[]
): Promise<ActiveSession | null> {
  if (!newPoints || newPoints.length === 0) return null

  try {
    const session = await getActiveSession()
    if (!session || session.status !== "recording") return null

    let updatedPoints = [...session.points]
    let updatedDistance = session.distanceMeters
    let updatedCurrentSpeed = session.currentSpeedMps
    let updatedMaxSpeed = session.maxSpeedMps
    let modified = false

    let lastPoint = updatedPoints.length > 0 ? updatedPoints[updatedPoints.length - 1] : null

    for (const point of newPoints) {
      if (!isValidLocationPoint(point)) continue

      // Drops repeated points from the same fix.
      if (
        lastPoint &&
        lastPoint.latitude === point.latitude &&
        lastPoint.longitude === point.longitude &&
        lastPoint.timestamp === point.timestamp
      ) {
        continue
      }

      updatedPoints.push(point)
      modified = true

      if (point.speed !== null && point.speed >= 0) {
        updatedCurrentSpeed = point.speed
        updatedMaxSpeed = Math.max(updatedMaxSpeed, point.speed)
      }

      if (lastPoint) {
        const dist = haversineDistance(
          lastPoint.latitude,
          lastPoint.longitude,
          point.latitude,
          point.longitude
        )
        if (dist > 0.5) {
          updatedDistance += dist
        }
      }

      lastPoint = point
    }

    if (!modified) return session

    const updatedSession: ActiveSession = {
      ...session,
      points: updatedPoints,
      distanceMeters: updatedDistance,
      currentSpeedMps: updatedCurrentSpeed,
      maxSpeedMps: updatedMaxSpeed,
    }

    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updatedSession))
    return updatedSession
  } catch (err) {
    console.error("[activeSessionStorage] Failed to append points to active session:", err)
    return null
  }
}

export async function pauseActiveSession(): Promise<ActiveSession | null> {
  try {
    const session = await getActiveSession()
    if (!session || session.status === "paused") return session

    const updatedSession: ActiveSession = {
      ...session,
      status: "paused",
      pausedAt: Date.now(),
    }

    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updatedSession))
    return updatedSession
  } catch (err) {
    console.error("[activeSessionStorage] Failed to pause active session:", err)
    return null
  }
}

export async function resumeActiveSession(): Promise<ActiveSession | null> {
  try {
    const session = await getActiveSession()
    if (!session || session.status === "recording") return session

    const now = Date.now()
    const additionalPauseMs = session.pausedAt ? now - session.pausedAt : 0

    const updatedSession: ActiveSession = {
      ...session,
      status: "recording",
      pausedAt: null,
      totalPausedMs: session.totalPausedMs + additionalPauseMs,
    }

    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updatedSession))
    return updatedSession
  } catch (err) {
    console.error("[activeSessionStorage] Failed to resume active session:", err)
    return null
  }
}

export async function clearActiveSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY)
  } catch (err) {
    console.error("[activeSessionStorage] Failed to clear active session:", err)
  }
}

export function computeElapsedSeconds(session: ActiveSession): number {
  if (!session.startedAt) return 0
  const now = session.status === "paused" && session.pausedAt ? session.pausedAt : Date.now()
  const totalMs = now - session.startedAt - session.totalPausedMs
  return Math.max(0, Math.floor(totalMs / 1000))
}
