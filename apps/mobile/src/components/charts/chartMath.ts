import {
  metersToDistance,
  metersToElevation,
  speedToMps,
  type DistanceUnit,
  type ElevationUnit,
  type SpeedUnit,
} from "@repo/units"

export type ChartPoint = {
  distance: number
  altitude: number
  speed: number
  grade: number
}

export const MAX_POINTS = 500
export const GRADE_SMOOTHING_WINDOW = 2 // ±2 neighbours → 5-point moving average
export const GRADE_CLAMP = 50 // ±50 % - anything beyond is GPS noise
export const MIN_DIST_FOR_GRADE_M = 0.5 // ignore sub-meter deltas (GPS jitter)

/** Clamp a grade percentage into a sane display range. */
export function clampGrade(grade: number): number {
  if (!Number.isFinite(grade)) return 0
  return Math.min(GRADE_CLAMP, Math.max(-GRADE_CLAMP, grade))
}

/** Format a grade for display, e.g. `+5.3%`, `−2.0%`. */
export function formatGrade(grade: number): string {
  if (!Number.isFinite(grade)) return "—"
  const sign = grade > 0.05 ? "+" : grade < -0.05 ? "-" : ""
  return `${sign}${Math.abs(grade).toFixed(1)}%`
}

function isValidNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n)
}

/**
 * Builds downsampled chart points from raw telemetry streams (meters).
 * Grade % = (Δelev / Δdist) × 100, from the raw arrays so unit conversion cannot
 * skew it. Never throws: a bad sample repeats the last one.
 */
export function buildChartData(
  distanceData: number[],
  altitudeData: number[],
  speedData: number[],
  distanceUnit: DistanceUnit,
  elevationUnit: ElevationUnit,
  speedUnit: SpeedUnit
): ChartPoint[] {
  if (!Array.isArray(distanceData) || !Array.isArray(altitudeData)) return []
  const speeds = Array.isArray(speedData) ? speedData : []
  const len = Math.min(distanceData.length, altitudeData.length)
  if (len === 0) return []

  // Downsample to MAX_POINTS for render performance.
  const step = Math.max(1, Math.floor(len / MAX_POINTS))
  const rawIndex: number[] = []
  for (let i = 0; i < len; i += step) rawIndex.push(i)
  const n = rawIndex.length
  if (n === 0) return []

  // 1. Convert units. One NaN must not kill the chart.
  const distances: number[] = new Array(n)
  const altitudes: number[] = new Array(n)
  const speedsOut: number[] = new Array(n)
  for (let j = 0; j < n; j++) {
    const i = rawIndex[j]!
    const dRaw = distanceData[i]
    const aRaw = altitudeData[i]
    const sRaw = speeds[i] ?? speeds[speeds.length - 1] ?? 0
    distances[j] = isValidNumber(dRaw)
      ? metersToDistance(dRaw, distanceUnit)
      : (j > 0 ? distances[j - 1]! : 0)
    altitudes[j] = isValidNumber(aRaw)
      ? metersToElevation(aRaw, elevationUnit)
      : (j > 0 ? altitudes[j - 1]! : 0)
    speedsOut[j] = isValidNumber(sRaw) ? speedToMps(sRaw, speedUnit) : 0
  }

  // 2. Raw grade, backward difference per downsampled step.
  const rawGrades: number[] = new Array(n)
  for (let j = 0; j < n; j++) {
    if (j === 0) {
      rawGrades[j] = 0 // filled from neighbour after smoothing
      continue
    }
    const i = rawIndex[j]!
    const p = rawIndex[j - 1]!
    const dAlt = altitudeData[i]! - altitudeData[p]!
    const dDist = distanceData[i]! - distanceData[p]!
    if (!isValidNumber(dAlt) || !isValidNumber(dDist) || dDist < MIN_DIST_FOR_GRADE_M) {
      rawGrades[j] = rawGrades[j - 1]! // carry forward across gaps / standstill
    } else {
      rawGrades[j] = clampGrade((dAlt / dDist) * 100)
    }
  }

  // 3. Centered moving average, to kill GPS jitter.
  const grades: number[] = new Array(n)
  for (let j = 0; j < n; j++) {
    let sum = 0
    let count = 0
    for (
      let k = Math.max(0, j - GRADE_SMOOTHING_WINDOW);
      k <= Math.min(n - 1, j + GRADE_SMOOTHING_WINDOW);
      k++
    ) {
      sum += rawGrades[k]!
      count++
    }
    grades[j] = Number((sum / Math.max(1, count)).toFixed(1))
  }
  if (n > 1) grades[0] = grades[1]! // no artificial 0 % at the start

  return rawIndex.map((_, j) => ({
    distance: distances[j]!,
    altitude: altitudes[j]!,
    speed: speedsOut[j]!,
    grade: grades[j]!,
  }))
}
