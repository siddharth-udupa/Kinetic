export const MIN_DISTANCE_METERS = 1_000
export const MAX_DISTANCE_METERS = 80_000
export const MIN_ROUTE_LENGTH_RATIO = 0.5
/** A route this far past the target cannot be rescued by ranking. */
export const MAX_ROUTE_LENGTH_RATIO = 2

/** How many independent loop shapes are routed before ranking. */
export const CANDIDATE_COUNT = 10
/** Valhalla requests in flight at once. Keeps a local instance responsive. */
export const CANDIDATE_CONCURRENCY = 8

/** Hard ceiling for one `/loop` request, including refinements. */
export const LOOP_BUDGET_MS = 25_000
export const MAX_VALHALLA_CALLS = 40
export const DEFAULT_ATTEMPT_TIMEOUT_MS = 10_000
/** Under this much remaining time there is no useful route left to start. */
export const MIN_ATTEMPT_TIMEOUT_MS = 250

/** One distance-refinement pass for the most promising shapes. */
export const MAX_CORRECTIONS = 4
export const CORRECTION_RADIUS_MIN = 0.6
export const CORRECTION_RADIUS_MAX = 1.6
export const MAX_REFINE_DISTANCE_ERROR = 0.35

/** Inside this band a loop is considered to have met the requested distance. */
export const TARGET_TOLERANCE = 0.08
export const ACCURACY_WARNING_THRESHOLD = 0.15

/**
 * Quality gates. A candidate must pass all of these to be returned as a clean
 * loop. The ranking only orders candidates that already cleared the bar.
 */
export const MAX_DISTANCE_ERROR = 0.2
export const MAX_REPEATED_ROAD_FRACTION = 0.12
/** A closed loop with any real crossing is two lobes, not one loop. */
export const MAX_SELF_INTERSECTIONS = 0
export const MIN_COMPACTNESS = 0.18
export const MAX_U_TURNS_PER_10KM = 5
export const MAX_SHARP_TURNS_PER_10KM = 20

/** If nothing clears every gate, one fallback may still be usable. */
export const FALLBACK_MAX_DISTANCE_ERROR = 0.3
export const FALLBACK_MAX_REPEATED_ROAD_FRACTION = 0.25
export const FALLBACK_MIN_COMPACTNESS = 0.1
export const FALLBACK_MAX_SELF_INTERSECTIONS = 3
export const FALLBACK_MAX_U_TURNS_PER_10KM = 10

/** Warning thresholds for the loop that is actually returned. */
export const REPEATED_ROAD_WARNING_THRESHOLD = 0.06
export const COMPACTNESS_WARNING_THRESHOLD = 0.25

/**
 * Control-point generation. The straight-line perimeter of a loop is shorter
 * than the routed one, so the radius is divided by a sampled detour factor.
 * The sampled range is wide on purpose: 30 candidates span several road
 * networks, and distance refinement fixes the survivors that overshoot.
 */
export const DETOUR_FACTOR_MIN = 1.15
export const DETOUR_FACTOR_MAX = 1.6
export const SHAPE_STRETCH = 0.22
export const SHAPE_WOBBLE = 0.05
export const MIN_VIA_RADIUS_METERS = 80

/**
 * `through` vias are snapped to the nearest road. A large snap radius can move
 * a control point onto an unrelated road and manufacture a detour, so the
 * radius is kept proportional to the loop and the cutoff stays tight.
 */
export const THROUGH_RADIUS_MIN_METERS = 60
export const THROUGH_RADIUS_MAX_METERS = 150
export const THROUGH_RADIUS_RATIO = 0.08
export const SEARCH_CUTOFF_RATIO = 2.5
export const SEARCH_CUTOFF_MIN_METERS = 150
export const SEARCH_CUTOFF_MAX_METERS = 400
/** A via further than this from the returned shape was snapped somewhere else. */
export const MAX_VIA_DISTANCE_METERS = 180
export const MAX_CLOSURE_METERS = 50

/** Geometry analysis for repeated roads, self-crossings and sharp turns. */
export const OVERLAP_SAMPLE_STEP_METERS = 10
export const OVERLAP_PROXIMITY_METERS = 14
export const OVERLAP_MIN_SEPARATION_METERS = 40
export const OVERLAP_MAX_ANGLE_DEGREES = 35

export const INTERSECTION_GRID_METERS = 100
/** Legs this close that meet at an angle are a self-touch, e.g. a shared junction. */
export const INTERSECTION_TOUCH_METERS = 2
/** Parallel legs that merely pass close are not a crossing. */
export const INTERSECTION_TOUCH_ANGLE_DEGREES = 25
/** A touch closer than this along the route is a jog through one junction. */
export const INTERSECTION_TOUCH_SEPARATION_METERS = 150
export const INTERSECTION_CLUSTER_METERS = 20
export const INTERSECTION_CLOSURE_EXCLUSION_METERS = 50

export const TURN_SAMPLE_STEP_METERS = 5
export const TURN_LOOKAHEADS_METERS = [15, 30, 60]
export const SHARP_TURN_DEGREES = 120
export const U_TURN_DEGREES = 150
export const TURN_COOLDOWN_METERS = 40

/** Two returned loops this similar are treated as the same route. */
export const DUPLICATE_SIMILARITY = 0.65
export const DUPLICATE_CELL_METERS = 25

/** Shape term saturates at a rounded loop rather than an out-and-back. */
export const COMPACTNESS_SCORE_TARGET = 0.45
export const ELEVATION_NOISE_THRESHOLD = 2

export function clampDistance(distanceMeters: number): number {
  return Math.max(
    MIN_DISTANCE_METERS,
    Math.min(MAX_DISTANCE_METERS, distanceMeters)
  )
}
