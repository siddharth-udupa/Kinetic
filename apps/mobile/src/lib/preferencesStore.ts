import AsyncStorage from "@react-native-async-storage/async-storage"
import { useEffect, useSyncExternalStore } from "react"
import type { PreferencesType } from "@repo/types"
import { authClient, useSession } from "@/lib/auth-client"

const API_URL = process.env.EXPO_PUBLIC_API_URL!

const STORAGE_KEY_PREFIX = "@strava_clone_preferences_v1:"

// How long the cached copy is trusted before re-syncing with the server.
const RESYNC_INTERVAL_MS = 5 * 60 * 1000

/** Render-time fallback only. Never saved - the server owns the real values. */
export const DEFAULT_PREFERENCES: PreferencesType = {
  userId: "",
  onBoarded: false,
  theme: "system",
  distanceUnit: "metric",
  elevationUnit: "meters",
  paceUnit: "min/km",
  speedUnit: "km/h",
  weightUnit: "kg",
  timeFormat: "24h",
  updatedAt: null,
}

export type PreferencesStatus = "idle" | "loading" | "ready"

export type PreferencesState = {
  status: PreferencesStatus
  userId: string | null
  preferences: PreferencesType | null
}

let state: PreferencesState = { status: "idle", userId: null, preferences: null }

const listeners = new Set<() => void>()

function setState(next: PreferencesState) {
  // Skips no-op updates so subscribers are not churned.
  if (
    state.status === next.status &&
    state.userId === next.userId &&
    state.preferences === next.preferences
  ) {
    return
  }
  state = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => state

function storageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`
}

/** `updatedAt` comes back from JSON as a string, so it is turned back into a Date. */
function normalize(raw: unknown): PreferencesType | null {
  if (!raw || typeof raw !== "object") return null
  const prefs = raw as Partial<PreferencesType>
  if (typeof prefs.userId !== "string" || typeof prefs.onBoarded !== "boolean") {
    return null
  }
  return {
    ...(prefs as PreferencesType),
    updatedAt: prefs.updatedAt ? new Date(prefs.updatedAt) : null,
  }
}

async function readStoredPreferences(userId: string): Promise<PreferencesType | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId))
    if (!raw) return null
    return normalize(JSON.parse(raw))
  } catch (err) {
    console.warn("[preferences] Failed to read local preferences:", err)
    return null
  }
}

async function writeStoredPreferences(prefs: PreferencesType): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(prefs.userId), JSON.stringify(prefs))
  } catch (err) {
    console.warn("[preferences] Failed to persist preferences:", err)
  }
}

/** The in-flight hydration, so concurrent callers share one disk read. */
let inFlight: { userId: string; promise: Promise<PreferencesType | null> } | null = null

/** Timestamp of the last successful server sync, for the resync window. */
let lastSyncedAt = 0

/**
 * Adopt a server row as the new truth. Every mutation goes through here, so the
 * device copy never lags.
 */
export async function applyServerPreferences(prefs: PreferencesType): Promise<void> {
  const normalized = normalize(prefs)
  if (!normalized) return

  // A response that lands after a sign-out is not published, but still saved.
  if (state.userId === normalized.userId) {
    setState({ status: "ready", userId: normalized.userId, preferences: normalized })
    // Marks the cached copy fresh, so the next mount does not re-fetch it.
    lastSyncedAt = Date.now()
  }
  await writeStoredPreferences(normalized)
}

/**
 * Re-read from the server. Never throws: on failure the cached copy stays authoritative,
 * so onboarding cannot replay.
 */
export async function refreshPreferences(
  options: { force?: boolean } = {},
): Promise<PreferencesType | null> {
  const userId = state.userId
  if (!userId) return null

  if (!options.force && lastSyncedAt > 0 && Date.now() - lastSyncedAt < RESYNC_INTERVAL_MS) {
    return state.preferences
  }

  try {
    const res = await authClient.$fetch<PreferencesType>(`${API_URL}/api/preferences`)
    const remote = res?.error ? null : normalize(res?.data)
    if (!remote) return state.preferences
    // Stamps `lastSyncedAt` via applyServerPreferences.
    await applyServerPreferences(remote)
    return remote
  } catch (err) {
    console.warn("[preferences] Sync failed, keeping local copy:", err)
    return state.preferences
  }
}

/**
 * Make preferences available for `userId`, preferring the device copy.
 * The onboarding gate waits on this.
 */
export async function hydratePreferences(userId: string): Promise<PreferencesType | null> {
  if (inFlight?.userId === userId) return inFlight.promise
  if (state.userId === userId && state.status === "ready") return state.preferences

  if (state.userId !== userId) {
    // A different account is becoming active. Clear first, then read: no screen
    // can render the previous account's preferences while disk is being read.
    inFlight = null
    setState({ status: "loading", userId, preferences: null })
  }

  const promise = (async () => {
    const local = await readStoredPreferences(userId)
    // The account may have changed while we were reading.
    if (state.userId !== userId) return null

    if (local) {
      setState({ status: "ready", userId, preferences: local })
      // Catches changes made on another device, without holding up the gate.
      void refreshPreferences()
      return local
    }

    const remote = await refreshPreferences({ force: true })
    if (state.userId !== userId) return null
    // `remote` is null if the network failed. Status is still "ready", so the gate
    // falls through to onboarding instead of spinning forever.
    setState({ status: "ready", userId, preferences: remote })
    return remote
  })()

  inFlight = { userId, promise }
  return promise
}

/**
 * Drop the in-memory snapshot on sign-out. The per-user copy on disk is kept.
 */
export function clearPreferences(): void {
  inFlight = null
  lastSyncedAt = 0
  setState({ status: "idle", userId: null, preferences: null })
}

/** Read the user's preferences, hydrating on mount. `status: "ready"` means the values are
 *  trustworthy; consumers needing only units can use DEFAULT_PREFERENCES. */
export function usePreferences(): PreferencesState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const { data: session } = useSession()
  const userId = session?.user.id

  useEffect(() => {
    if (!userId) {
      clearPreferences()
      return
    }
    hydratePreferences(userId).catch((err) => {
      console.warn("[preferences] Hydration failed:", err)
    })
  }, [userId])

  return snapshot
}
