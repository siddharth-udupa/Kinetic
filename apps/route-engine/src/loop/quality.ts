import {
  analyseOverlap,
  analyseTurns,
  countSelfIntersections,
  projectShape,
  sampleShape,
  type GeoPoint,
} from "../geo/index.js"
import {
  COMPACTNESS_SCORE_TARGET,
  DUPLICATE_CELL_METERS,
  DUPLICATE_SIMILARITY,
  FALLBACK_MAX_DISTANCE_ERROR,
  FALLBACK_MAX_REPEATED_ROAD_FRACTION,
  FALLBACK_MAX_SELF_INTERSECTIONS,
  FALLBACK_MAX_U_TURNS_PER_10KM,
  FALLBACK_MIN_COMPACTNESS,
  INTERSECTION_CLOSURE_EXCLUSION_METERS,
  INTERSECTION_CLUSTER_METERS,
  INTERSECTION_GRID_METERS,
  INTERSECTION_TOUCH_ANGLE_DEGREES,
  INTERSECTION_TOUCH_METERS,
  INTERSECTION_TOUCH_SEPARATION_METERS,
  MAX_DISTANCE_ERROR,
  MAX_REPEATED_ROAD_FRACTION,
  MAX_SELF_INTERSECTIONS,
  MAX_SHARP_TURNS_PER_10KM,
  MAX_U_TURNS_PER_10KM,
  MIN_COMPACTNESS,
  OVERLAP_MAX_ANGLE_DEGREES,
  OVERLAP_MIN_SEPARATION_METERS,
  OVERLAP_PROXIMITY_METERS,
  OVERLAP_SAMPLE_STEP_METERS,
  SHARP_TURN_DEGREES,
  TURN_COOLDOWN_METERS,
  TURN_LOOKAHEADS_METERS,
  TURN_SAMPLE_STEP_METERS,
  U_TURN_DEGREES,
} from "./config.js"
import type { Candidate, RouteQuality } from "./types.js"

export type RejectionCode =
  | "distance"
  | "overlap"
  | "self_intersection"
  | "compactness"
  | "turns"

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function per10Km(count: number, distanceMeters: number): number {
  return count / Math.max(0.1, distanceMeters / 10_000)
}

/** Every shape metric that needs no extra routing call. */
export function analyseRoute(shape: GeoPoint[]): RouteQuality {
  const projected = projectShape(shape)

  const overlap = analyseOverlap(projected, {
    stepMeters: OVERLAP_SAMPLE_STEP_METERS,
    proximityMeters: OVERLAP_PROXIMITY_METERS,
    minSeparationMeters: OVERLAP_MIN_SEPARATION_METERS,
    maxAngleDegrees: OVERLAP_MAX_ANGLE_DEGREES,
  })

  const turns = analyseTurns(projected, {
    stepMeters: TURN_SAMPLE_STEP_METERS,
    lookaheadsMeters: TURN_LOOKAHEADS_METERS,
    sharpTurnDegrees: SHARP_TURN_DEGREES,
    uTurnDegrees: U_TURN_DEGREES,
    cooldownMeters: TURN_COOLDOWN_METERS,
  })

  return {
    repeatedRoadMeters: overlap.repeatedMeters,
    repeatedRoadFraction: overlap.repeatedFraction,
    selfIntersections: countSelfIntersections(projected, {
      cellSize: INTERSECTION_GRID_METERS,
      touchMeters: INTERSECTION_TOUCH_METERS,
      minTouchAngleDegrees: INTERSECTION_TOUCH_ANGLE_DEGREES,
      minTouchSeparationMeters: INTERSECTION_TOUCH_SEPARATION_METERS,
      clusterMeters: INTERSECTION_CLUSTER_METERS,
      closureExclusionMeters: INTERSECTION_CLOSURE_EXCLUSION_METERS,
    }),
    sharpTurns: turns.sharpTurns,
    uTurns: turns.uTurns,
  }
}

/**
 * The gates every returned loop must clear. Distance error is included here
 * even when a candidate is otherwise clean: a beautiful loop 30% off target is
 * still the wrong loop.
 */
export function rejectionCodes(candidate: Candidate): RejectionCode[] {
  const codes: RejectionCode[] = []

  if (candidate.accuracy > MAX_DISTANCE_ERROR) codes.push("distance")
  if (candidate.repeatedRoadFraction > MAX_REPEATED_ROAD_FRACTION) {
    codes.push("overlap")
  }
  if (candidate.selfIntersections > MAX_SELF_INTERSECTIONS) {
    codes.push("self_intersection")
  }
  if (candidate.loopiness < MIN_COMPACTNESS) codes.push("compactness")

  const uTurnsPer10Km = per10Km(
    candidate.uTurns,
    candidate.distanceMeters
  )
  const sharpTurnsPer10Km = per10Km(
    candidate.sharpTurns,
    candidate.distanceMeters
  )
  if (
    uTurnsPer10Km > MAX_U_TURNS_PER_10KM ||
    sharpTurnsPer10Km > MAX_SHARP_TURNS_PER_10KM
  ) {
    codes.push("turns")
  }

  return codes
}

/**
 * Lower is better. Distance and overlap carry most of the weight because they
 * are the two failures a rider notices immediately; compactness and turns
 * separate loops that are otherwise close.
 */
export function scoreCandidate(candidate: Candidate): number {
  const distance = clamp01(candidate.accuracy / MAX_DISTANCE_ERROR)
  const overlap = clamp01(
    candidate.repeatedRoadFraction / MAX_REPEATED_ROAD_FRACTION
  )
  const intersections = clamp01(
    candidate.selfIntersections / (MAX_SELF_INTERSECTIONS + 1)
  )
  const compactness =
    1 - clamp01(candidate.loopiness / COMPACTNESS_SCORE_TARGET)
  const uTurns = clamp01(
    per10Km(candidate.uTurns, candidate.distanceMeters) /
      MAX_U_TURNS_PER_10KM
  )
  const sharpTurns = clamp01(
    per10Km(candidate.sharpTurns, candidate.distanceMeters) /
      MAX_SHARP_TURNS_PER_10KM
  )

  return (
    0.34 * distance +
    0.3 * overlap +
    0.14 * intersections +
    0.12 * compactness +
    0.06 * uTurns +
    0.04 * sharpTurns
  )
}

/** A last-resort route when none of the 30 candidates clears every gate. */
export function isUsableFallback(candidate: Candidate): boolean {
  return (
    candidate.accuracy <= FALLBACK_MAX_DISTANCE_ERROR &&
    candidate.repeatedRoadFraction <=
      FALLBACK_MAX_REPEATED_ROAD_FRACTION &&
    candidate.loopiness >= FALLBACK_MIN_COMPACTNESS &&
    candidate.selfIntersections <= FALLBACK_MAX_SELF_INTERSECTIONS &&
    per10Km(candidate.uTurns, candidate.distanceMeters) <=
      FALLBACK_MAX_U_TURNS_PER_10KM
  )
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

function coverage(
  samples: ReturnType<typeof sampleShape>,
  cells: Set<string>
): number {
  if (samples.length === 0) return 0

  let hits = 0
  for (const sample of samples) {
    const cellX = Math.floor(sample.x / DUPLICATE_CELL_METERS)
    const cellY = Math.floor(sample.y / DUPLICATE_CELL_METERS)
    let found = false

    for (let offsetX = -1; offsetX <= 1 && !found; offsetX++) {
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        if (cells.has(cellKey(cellX + offsetX, cellY + offsetY))) {
          found = true
          break
        }
      }
    }

    if (found) hits++
  }

  return hits / samples.length
}

/**
 * Fraction of the shorter route that lies on the same ground as the other.
 * Used to stop three near-identical loops from filling the response.
 */
export function shapeSimilarity(a: GeoPoint[], b: GeoPoint[]): number {
  const samplesA = sampleShape(
    projectShape(a),
    DUPLICATE_CELL_METERS
  )
  const samplesB = sampleShape(
    projectShape(b),
    DUPLICATE_CELL_METERS
  )
  if (samplesA.length === 0 || samplesB.length === 0) return 0

  const cellsA = new Set(
    samplesA.map((sample) =>
      cellKey(
        Math.floor(sample.x / DUPLICATE_CELL_METERS),
        Math.floor(sample.y / DUPLICATE_CELL_METERS)
      )
    )
  )
  const cellsB = new Set(
    samplesB.map((sample) =>
      cellKey(
        Math.floor(sample.x / DUPLICATE_CELL_METERS),
        Math.floor(sample.y / DUPLICATE_CELL_METERS)
      )
    )
  )

  return Math.min(coverage(samplesA, cellsB), coverage(samplesB, cellsA))
}

export function routesLookAlike(a: Candidate, b: Candidate): boolean {
  const shorter = Math.min(a.distanceMeters, b.distanceMeters)
  if (shorter <= 0) return false

  if (
    Math.abs(a.distanceMeters - b.distanceMeters) / shorter > 0.06
  ) {
    return false
  }

  return shapeSimilarity(a.shape, b.shape) >= DUPLICATE_SIMILARITY
}
