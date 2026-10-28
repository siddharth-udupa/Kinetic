import { randomInt } from "node:crypto"
import { encodePolyline } from "@repo/gpx"
import type { LoopRequest, LoopResponse, RouteProfile } from "@repo/validation"
import {
  decodePolyline6,
  destination,
  distanceToShape,
  shapeLength,
  shoelaceArea,
  type GeoPoint,
} from "./geo.js"
import {
  route,
  ValhallaError,
  type ValhallaLeg,
  type ValhallaRouteRequest,
  type ValhallaRouteResponse,
} from "./valhalla.js"

const MIN_DISTANCE_METERS = 1_000
const MAX_DISTANCE_METERS = 80_000

/** Hard ceiling from the plan: a loop may not spend more than this long. */
const LOOP_BUDGET_MS = 2_500
const MAX_VALHALLA_CALLS = 10
const MAX_CORRECTIONS = 2
const TARGET_TOLERANCE = 0.08

const THROUGH_RADIUS_METERS = 300
const SEARCH_CUTOFF_METERS = 800
/** A via further than this from the returned shape was snapped somewhere else. */
const MAX_VIA_DISTANCE_METERS = 150

/**
 * A routed triangle is longer than its straight-line perimeter. 1.5 km of
 * circumradius routed to 8.63 km in the step 2 check, a factor of 1.11. 1.15
 * starts the search a little closer than that so corrections mostly grow it.
 */
const DETOUR_FACTOR = 1.15
const ELEVATION_NOISE_THRESHOLD = 2

export type LoopErrorCode = "no_candidate"

/** A request the engine understood but could not satisfy with the graph. */
export class LoopError extends Error {
  readonly code: LoopErrorCode

  constructor(message: string, code: LoopErrorCode = "no_candidate") {
    super(message)
    this.name = "LoopError"
    this.code = code
  }
}

type Candidate = {
  bearing: number
  radius: number
  shape: GeoPoint[]
  trip: ValhallaRouteResponse["trip"]
  distanceMeters: number
  durationSeconds: number
  elevationGainMeters: number
  loopiness: number
  accuracy: number
  score: number
}

type Budget = {
  calls: number
  deadline: number
}

function canCall(budget: Budget): boolean {
  return (
    budget.calls < MAX_VALHALLA_CALLS && performance.now() < budget.deadline
  )
}

function remainingBudgetMs(budget: Budget): number {
  return budget.deadline - performance.now()
}

/** Deterministic PRNG so one seed always rebuilds the same four candidates. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

function resolveSeed(seed: number | undefined): number {
  return seed === undefined ? randomInt(0, 4_294_967_296) : seed >>> 0
}

function profileCosting(profile: RouteProfile): "bicycle" | "pedestrian" {
  return profile === "bike" ? "bicycle" : "pedestrian"
}

/**
 * The same 2 m dead band as `@repo/gpx`'s `computeElevation`, so a generated
 * route and the same track recorded as an activity report the same climb.
 */
function elevationGain(elevation: number[] | undefined): number {
  if (!elevation || elevation.length < 2) return 0

  let gain = 0
  for (let index = 1; index < elevation.length; index++) {
    const difference = elevation[index] - elevation[index - 1]
    if (difference > ELEVATION_NOISE_THRESHOLD) gain += difference
  }

  return Math.round(gain)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function isFatal(error: unknown): boolean {
  return (
    error instanceof ValhallaError &&
    (error.code === "timeout" || error.code === "unreachable")
  )
}

function buildRequest(
  origin: GeoPoint,
  first: GeoPoint,
  second: GeoPoint,
  profile: RouteProfile,
  id: string
): ValhallaRouteRequest {
  return {
    locations: [
      { lat: origin.lat, lon: origin.lng },
      {
        lat: first.lat,
        lon: first.lng,
        type: "through",
        radius: THROUGH_RADIUS_METERS,
        search_cutoff: SEARCH_CUTOFF_METERS,
      },
      {
        lat: second.lat,
        lon: second.lng,
        type: "through",
        radius: THROUGH_RADIUS_METERS,
        search_cutoff: SEARCH_CUTOFF_METERS,
      },
      { lat: origin.lat, lon: origin.lng },
    ],
    costing: profileCosting(profile),
    units: "kilometers",
    directions_type: "none",
    elevation_interval: 30,
    id,
  }
}

/**
 * Routes one triangle and scores it. Returns `null` when the candidate is not
 * a loop we are willing to show: a ferry crossing, a via that snapped far from
 * where it was asked to be, or a route shorter than half the target.
 */
async function attempt(
  origin: GeoPoint,
  bearing: number,
  radius: number,
  profile: RouteProfile,
  targetDistanceMeters: number,
  requestId: string,
  budget: Budget
): Promise<Candidate | null> {
  if (!canCall(budget)) return null

  const first = destination(origin, bearing, radius)
  const second = destination(origin, bearing + 120, radius)
  const timeoutMs = Math.min(2_000, remainingBudgetMs(budget))

  // Under 250 ms there is no useful route left; let the caller return the best
  // candidate it already has rather than start a doomed call.
  if (timeoutMs < 250) return null

  budget.calls += 1
  const { trip } = await route(
    buildRequest(origin, first, second, profile, requestId),
    { requestId, timeoutMs }
  )

  const leg = trip.legs[0] as ValhallaLeg | undefined
  if (!leg || typeof leg.shape !== "string") {
    return null
  }

  const shape = decodePolyline6(leg.shape)
  if (shape.length < 2) return null

  const measuredLength = shapeLength(shape)
  const summaryLength = trip.summary.length * 1_000
  const distanceMeters =
    summaryLength > 0 && Number.isFinite(summaryLength)
      ? summaryLength
      : measuredLength

  if (distanceMeters < targetDistanceMeters * 0.5) return null
  if (trip.summary.has_ferry) return null

  const viaDistances = [
    distanceToShape(first, shape),
    distanceToShape(second, shape),
  ]
  if (viaDistances.some((distance) => distance > MAX_VIA_DISTANCE_METERS)) {
    return null
  }

  const area = shoelaceArea(shape)
  const loopiness =
    measuredLength === 0
      ? 0
      : (4 * Math.PI * area) / (measuredLength * measuredLength)

  const accuracy = Math.abs(distanceMeters - targetDistanceMeters) /
    targetDistanceMeters

  // Distance first, then shape quality. The shape term saturates at 0.06, which
  // is roughly a rounded triangle rather than an out-and-back.
  const score =
    accuracy + 0.5 * (1 - Math.min(1, loopiness / 0.06))

  return {
    bearing,
    radius,
    shape,
    trip,
    distanceMeters,
    durationSeconds: trip.summary.time,
    elevationGainMeters: elevationGain(leg.elevation),
    loopiness,
    accuracy,
    score,
  }
}

/**
 * Builds a loop from four rotated triangles, then corrects the two best by
 * scaling their circumradius. Valhalla has no round-trip mode; the vias are
 * what force the route into a loop instead of an out-and-back.
 */
export async function generateLoop(
  input: LoopRequest,
  options: { requestId?: string } = {}
): Promise<LoopResponse> {
  const requestId = options.requestId ?? `loop_${randomInt(0, 4_294_967_296)}`
  const targetDistanceMeters = clamp(
    input.distanceMeters,
    MIN_DISTANCE_METERS,
    MAX_DISTANCE_METERS
  )
  const seed = resolveSeed(input.seed)
  const random = mulberry32(seed)
  const origin: GeoPoint = { lat: input.origin.lat, lng: input.origin.lon }
  const budget: Budget = {
    calls: 0,
    deadline: performance.now() + LOOP_BUDGET_MS,
  }
  const warnings: string[] = []

  if (targetDistanceMeters !== input.distanceMeters) {
    warnings.push(
      `Distance was clamped to the supported ${MIN_DISTANCE_METERS / 1_000}–${MAX_DISTANCE_METERS / 1_000} km range.`
    )
  }

  const startBearing = random() * 360
  const radius = targetDistanceMeters / (3 * Math.sqrt(3) * DETOUR_FACTOR)

  const candidates: Candidate[] = []

  for (const offset of [0, 90, 180, 270]) {
    if (!canCall(budget)) break

    const bearing = (startBearing + offset) % 360
    try {
      const candidate = await attempt(
        origin,
        bearing,
        radius,
        input.profile,
        targetDistanceMeters,
        requestId,
        budget
      )
      if (candidate) candidates.push(candidate)
    } catch (error) {
      // A transport failure will fail every remaining candidate too. A 400 from
      // one rotation (no path, a via in water) should not stop the others.
      if (isFatal(error)) {
        if (candidates.length > 0) {
          warnings.push("Stopped early; returning the best loop found so far.")
          budget.deadline = 0
          break
        }
        throw error
      }
    }
  }

  if (candidates.length === 0) {
    throw new LoopError(
      "Could not build a loop from this start point. Try a different distance or profile."
    )
  }

  candidates.sort((a, b) => a.score - b.score)
  let best = candidates[0]

  // Correct only the two best initial shapes, and only while they are outside
  // the 8% band. This keeps a typical request to four or fewer Valhalla calls.
  for (const contender of candidates.slice(0, 2)) {
    let current = contender

    for (
      let correction = 0;
      correction < MAX_CORRECTIONS && current.accuracy > TARGET_TOLERANCE;
      correction++
    ) {
      if (!canCall(budget)) break

      const nextRadius =
        current.radius * clamp(
          targetDistanceMeters / current.distanceMeters,
          0.6,
          1.6
        )

      try {
        const corrected = await attempt(
          origin,
          current.bearing,
          nextRadius,
          input.profile,
          targetDistanceMeters,
          requestId,
          budget
        )

        if (!corrected) break
        current = corrected
        if (corrected.score < best.score) best = corrected
        if (corrected.accuracy <= TARGET_TOLERANCE) break
      } catch (error) {
        if (isFatal(error)) {
          warnings.push("Stopped early; returning the best loop found so far.")
          budget.deadline = 0
        }
        break
      }
    }

    if (current.score < best.score) best = current
  }

  if (best.accuracy > 0.15) {
    warnings.push(
      `Closest loop is ${Math.round(best.accuracy * 100)}% away from the requested distance.`
    )
  }

  if (best.loopiness < 0.02) {
    warnings.push("The loop doubles back on itself.")
  }

  return {
    seed,
    profile: input.profile,
    requestedDistanceMeters: targetDistanceMeters,
    distanceMeters: Math.round(best.distanceMeters),
    durationSeconds: Math.round(best.durationSeconds),
    elevationGainMeters: best.elevationGainMeters,
    accuracy: Number(best.accuracy.toFixed(4)),
    loopiness: Number(best.loopiness.toFixed(4)),
    polyline: encodePolyline(
      best.shape.map((point) => ({ lat: point.lat, lng: point.lng }))
    ),
    warnings,
  }
}
