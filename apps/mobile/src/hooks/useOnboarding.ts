import { useState } from "react"
import type { PreferencesType } from "@repo/types"
import { authClient } from "@/lib/auth-client"
import { DEFAULT_PREFERENCES, applyServerPreferences } from "@/lib/preferencesStore"

const API_URL = process.env.EXPO_PUBLIC_API_URL!

export type OnboardingPrefs = {
  theme: "system" | "dark" | "light"
  distanceUnit: "metric" | "imperial"
  elevationUnit: "meters" | "feet"
  paceUnit: "min/km" | "min/mi"
  speedUnit: "km/h" | "mph" | "m/s"
  weightUnit: "kg" | "lb"
  timeFormat: "12h" | "24h"
}

/** Derived from the column defaults so the two can't drift apart. */
export const DEFAULT_PREFS: OnboardingPrefs = {
  theme: DEFAULT_PREFERENCES.theme,
  distanceUnit: DEFAULT_PREFERENCES.distanceUnit,
  elevationUnit: DEFAULT_PREFERENCES.elevationUnit,
  paceUnit: DEFAULT_PREFERENCES.paceUnit,
  speedUnit: DEFAULT_PREFERENCES.speedUnit,
  weightUnit: DEFAULT_PREFERENCES.weightUnit,
  timeFormat: DEFAULT_PREFERENCES.timeFormat,
}

export function useOnboarding() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Set the username. Returns null on success, or an error message on failure.
   */
  async function updateUsername(username: string): Promise<string | null> {
    setError(null)
    setIsLoading(true)
    try {
      const res = await authClient.$fetch(`${API_URL}/api/user`, {
        method: "PATCH",
        body: JSON.stringify({ username }),
        headers: { "Content-Type": "application/json" },
      })
      if (res.error) {
        const msg = (res.error as any)?.message ?? "Failed to update username."
        setError(msg)
        return msg
      }
      return null
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update username."
      setError(msg)
      return msg
    } finally {
      setIsLoading(false)
    }
  }

  /** Save preference fields (partial update). Pass { onBoarded: true } to finish onboarding. */
  async function updatePreferences(data: Partial<OnboardingPrefs> & { onBoarded?: boolean }): Promise<string | null> {
    setError(null)
    setIsLoading(true)
    try {
      const res = await authClient.$fetch<PreferencesType>(`${API_URL}/api/preferences`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      })
      if (res.error) {
        const msg = (res.error as any)?.message ?? "Failed to save preferences."
        setError(msg)
        return msg
      }
      // The server returns the merged row, so the device copy is authoritative here.
      // Without this the next launch reads a stale `onBoarded: false` off disk.
      if (res.data) {
        await applyServerPreferences(res.data)
      }
      return null
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save preferences."
      setError(msg)
      return msg
    } finally {
      setIsLoading(false)
    }
  }

  /** Save these preferences and mark onboarding complete. */
  async function completeOnboarding(prefs: OnboardingPrefs): Promise<string | null> {
    return updatePreferences({ ...prefs, onBoarded: true })
  }

  /** Skip onboarding: leave every preference at its default and just flip the flag. */
  async function skipOnboarding(): Promise<string | null> {
    return updatePreferences({ onBoarded: true })
  }

  return {
    isLoading,
    error,
    updateUsername,
    updatePreferences,
    completeOnboarding,
    skipOnboarding,
  }
}
