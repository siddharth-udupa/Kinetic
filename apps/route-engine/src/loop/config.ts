export const MIN_DISTANCE_METERS = 1_000
export const MAX_DISTANCE_METERS = 80_000
export const MIN_ROUTE_LENGTH_RATIO = 0.5

/** Hard ceiling from the plan: a loop may not spend more than this long. */
export const LOOP_BUDGET_MS = 2_500
export const MAX_VALHALLA_CALLS = 10
export const DEFAULT_ATTEMPT_TIMEOUT_MS = 2_000
/** Under this much remaining time there is no useful route left to start. */
export const MIN_ATTEMPT_TIMEOUT_MS = 250

export const MAX_CORRECTIONS = 2
export const TARGET_TOLERANCE = 0.08
export const ACCURACY_WARNING_THRESHOLD = 0.15
export const LOOPINESS_WARNING_THRESHOLD = 0.02

export const THROUGH_RADIUS_METERS = 300
export const SEARCH_CUTOFF_METERS = 800
/** A via further than this from the returned shape was snapped somewhere else. */
export const MAX_VIA_DISTANCE_METERS = 150

/**
 * A routed triangle is longer than its straight-line perimeter. 1.5 km of
 * circumradius routed to 8.63 km in the step 2 check, a factor of 1.11. 1.15
 * starts the search a little closer than that so corrections mostly grow it.
 */
export const DETOUR_FACTOR = 1.15

/** The shape term saturates here, roughly a rounded triangle rather than an out-and-back. */
export const LOOPINESS_SCORE_TARGET = 0.06
export const ELEVATION_NOISE_THRESHOLD = 2

export const CORRECTION_RADIUS_MIN = 0.6
export const CORRECTION_RADIUS_MAX = 1.6

export function clampDistance(distanceMeters: number): number {
  return Math.max(
    MIN_DISTANCE_METERS,
    Math.min(MAX_DISTANCE_METERS, distanceMeters)
  )
}
