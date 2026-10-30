import {
  ELEVATION_NOISE_THRESHOLD,
  LOOPINESS_SCORE_TARGET,
} from "./config.js"

/**
 * The same 2 m dead band as `@repo/gpx`'s `computeElevation`, so a generated
 * route and the same track recorded as an activity report the same climb.
 */
export function elevationGain(elevation: number[] | undefined): number {
  if (!elevation || elevation.length < 2) return 0

  let gain = 0
  for (let index = 1; index < elevation.length; index++) {
    const difference = elevation[index] - elevation[index - 1]
    if (difference > ELEVATION_NOISE_THRESHOLD) gain += difference
  }

  return Math.round(gain)
}

export function distanceAccuracy(
  distanceMeters: number,
  targetDistanceMeters: number
): number {
  return Math.abs(distanceMeters - targetDistanceMeters) / targetDistanceMeters
}

/** Distance first, then shape quality. */
export function scoreCandidate(accuracy: number, loopiness: number): number {
  return accuracy + 0.5 * (1 - Math.min(1, loopiness / LOOPINESS_SCORE_TARGET))
}
