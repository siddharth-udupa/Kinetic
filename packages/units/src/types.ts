export type DistanceUnit = "metric" | "imperial"

export type ElevationUnit = "meters" | "feet"

export type SpeedUnit = "km/h" | "mph" | "m/s"

export type PaceUnit = "min/km" | "min/mi"

export type UnitPreferences = {
  distance: DistanceUnit
  elevation: ElevationUnit
  speed: SpeedUnit
  pace: PaceUnit
}