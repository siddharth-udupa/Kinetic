import type { DistanceUnit, ElevationUnit, PaceUnit, SpeedUnit } from "./types"

/**
 * The preference fields onboarding writes. The unit fields reuse the conversion
 * types so a new unit cannot be added to one side and missed by the other.
 */
export type OnboardingPrefs = {
  theme: "system" | "dark" | "light"
  distanceUnit: DistanceUnit
  elevationUnit: ElevationUnit
  paceUnit: PaceUnit
  speedUnit: SpeedUnit
  weightUnit: "kg" | "lb"
  timeFormat: "12h" | "24h"
}

export type UnitSystem = DistanceUnit

/** A pref value narrowed to a string, so the generic setting rows can constrain on it. */
export type PrefValue<K extends keyof OnboardingPrefs> = OnboardingPrefs[K] & string

/**
 * The Ionicons names used by the unit settings. Each app maps these onto its own
 * renderer — Ionicons on mobile, lucide on web — rather than this package owning
 * a component library.
 */
export type UnitIconName =
  | "speedometer-outline"
  | "flag-outline"
  | "trending-up-outline"
  | "timer-outline"
  | "barbell-outline"

/** Everything a single system choice implies, so one tap fills the rest in. */
export const SYSTEM_DEFAULTS: Record<
  UnitSystem,
  Pick<
    OnboardingPrefs,
    "distanceUnit" | "elevationUnit" | "paceUnit" | "speedUnit" | "weightUnit"
  >
> = {
  metric: {
    distanceUnit: "metric",
    elevationUnit: "meters",
    paceUnit: "min/km",
    speedUnit: "km/h",
    weightUnit: "kg",
  },
  imperial: {
    distanceUnit: "imperial",
    elevationUnit: "feet",
    paceUnit: "min/mi",
    speedUnit: "mph",
    weightUnit: "lb",
  },
}

export const SYSTEMS: {
  value: UnitSystem
  label: string
  icon: UnitIconName
  summary: string
  chips: string[]
}[] = [
  {
    value: "metric",
    label: "Metric",
    icon: "speedometer-outline",
    summary: "Kilometres, metres and kilograms",
    chips: ["km", "m", "kg"],
  },
  {
    value: "imperial",
    label: "Imperial",
    icon: "flag-outline",
    summary: "Miles, feet and pounds",
    chips: ["mi", "ft", "lb"],
  },
]

type Setting<K extends keyof OnboardingPrefs> = {
  key: K
  label: string
  icon: UnitIconName
  options: { label: string; value: PrefValue<K> }[]
}

export const ELEVATION: Setting<"elevationUnit"> = {
  key: "elevationUnit",
  label: "Elevation",
  icon: "trending-up-outline",
  options: [
    { label: "Metres (m)", value: "meters" },
    { label: "Feet (ft)", value: "feet" },
  ],
}

export const PACE: Setting<"paceUnit"> = {
  key: "paceUnit",
  label: "Pace",
  icon: "timer-outline",
  options: [
    { label: "min / km", value: "min/km" },
    { label: "min / mi", value: "min/mi" },
  ],
}

export const SPEED: Setting<"speedUnit"> = {
  key: "speedUnit",
  label: "Speed",
  icon: "speedometer-outline",
  options: [
    { label: "km/h", value: "km/h" },
    { label: "mph", value: "mph" },
    { label: "m/s", value: "m/s" },
  ],
}

export const WEIGHT: Setting<"weightUnit"> = {
  key: "weightUnit",
  label: "Weight",
  icon: "barbell-outline",
  options: [
    { label: "Kilograms", value: "kg" },
    { label: "Pounds", value: "lb" },
  ],
}

export const SYSTEM_LABELS: Record<UnitSystem, string> = {
  metric: "Metric",
  imperial: "Imperial",
}

export const ELEVATION_LABELS: Record<OnboardingPrefs["elevationUnit"], string> = {
  meters: "Metres",
  feet: "Feet",
}

export const PACE_LABELS: Record<OnboardingPrefs["paceUnit"], string> = {
  "min/km": "min / km",
  "min/mi": "min / mi",
}

export const SPEED_LABELS: Record<OnboardingPrefs["speedUnit"], string> = {
  "km/h": "km/h",
  mph: "mph",
  "m/s": "m/s",
}

export const WEIGHT_LABELS: Record<OnboardingPrefs["weightUnit"], string> = {
  kg: "kg",
  lb: "lb",
}

export const THEME_LABELS: Record<OnboardingPrefs["theme"], string> = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
}

export const TIME_LABELS: Record<OnboardingPrefs["timeFormat"], string> = {
  "24h": "24-hour",
  "12h": "12-hour",
}

/** Short stack of unit abbreviations, for the "based on your choice" banner. */
export function systemChips(prefs: OnboardingPrefs): string[] {
  return [
    prefs.distanceUnit === "metric" ? "km" : "mi",
    prefs.elevationUnit === "meters" ? "m" : "ft",
    prefs.paceUnit,
    prefs.speedUnit,
    prefs.weightUnit,
  ]
}
