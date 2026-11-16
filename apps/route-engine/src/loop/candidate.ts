import type { RouteProfile } from "@repo/validation"
import {
  decodePolyline6,
  distanceBetween,
  distanceToShape,
  loopiness as shapeLoopiness,
  shapeLength,
  shoelaceArea,
  type GeoPoint,
} from "../geo/index.js"
import { route } from "../valhalla/index.js"
import { canCall, remainingBudgetMs } from "./budget.js"
import {
  DEFAULT_ATTEMPT_TIMEOUT_MS,
  MAX_CLOSURE_METERS,
  MAX_ROUTE_LENGTH_RATIO,
  MAX_VIA_DISTANCE_METERS,
  MIN_ATTEMPT_TIMEOUT_MS,
  MIN_ROUTE_LENGTH_RATIO,
} from "./config.js"
import { distanceAccuracy, elevationGain } from "./metrics.js"
import { analyseRoute, scoreCandidate } from "./quality.js"
import { buildLoopRequest, throughRadiusFor } from "./request.js"
import type { Budget, Candidate, CandidateSeed } from "./types.js"

export type CandidateContext = {
  origin: GeoPoint
  profile: RouteProfile
  targetDistanceMeters: number
  requestId: string
  budget: Budget
}

/**
 * Routes one seed and measures everything about the resulting shape. Returns
 * `null` for a route that cannot be a loop at all: a ferry crossing, a route
 * far outside the target, a via snapped somewhere else, or a shape that does
 * not come back to its start. Quality gates are applied later, after every
 * candidate has been routed, so the ranking can still see near misses.
 */
export async function routeCandidate(
  context: CandidateContext,
  seed: CandidateSeed
): Promise<Candidate | null> {
  const {
    origin,
    profile,
    targetDistanceMeters,
    requestId,
    budget,
  } = context

  if (!canCall(budget)) return null

  const timeoutMs = Math.min(
    DEFAULT_ATTEMPT_TIMEOUT_MS,
    remainingBudgetMs(budget)
  )
  if (timeoutMs < MIN_ATTEMPT_TIMEOUT_MS) return null

  budget.calls += 1
  const { trip } = await route(
    buildLoopRequest(seed, origin, profile, requestId),
    { requestId, timeoutMs }
  )

  const leg = trip.legs[0]
  if (!leg || typeof leg.shape !== "string") return null

  const shape = decodePolyline6(leg.shape)
  if (shape.length < 2) return null

  const measuredLength = shapeLength(shape)
  if (
    measuredLength < targetDistanceMeters * MIN_ROUTE_LENGTH_RATIO ||
    measuredLength > targetDistanceMeters * MAX_ROUTE_LENGTH_RATIO
  ) {
    return null
  }

  const summaryLength = trip.summary.length * 1_000
  const distanceMeters =
    summaryLength > 0 && Number.isFinite(summaryLength)
      ? summaryLength
      : measuredLength

  if (
    distanceMeters < targetDistanceMeters * MIN_ROUTE_LENGTH_RATIO ||
    distanceMeters > targetDistanceMeters * MAX_ROUTE_LENGTH_RATIO
  ) {
    return null
  }

  if (trip.summary.has_ferry) return null

  const allowedViaDistance = Math.max(
    MAX_VIA_DISTANCE_METERS,
    throughRadiusFor(seed) + 30
  )
  const viaDistances = seed.vias.map((via) =>
    distanceToShape(via.point, shape)
  )
  if (viaDistances.some((distance) => distance > allowedViaDistance)) {
    return null
  }

  if (
    distanceBetween(shape[0], shape[shape.length - 1]) >
    MAX_CLOSURE_METERS
  ) {
    return null
  }

  const loopiness = shapeLoopiness(shoelaceArea(shape), measuredLength)
  const accuracy = distanceAccuracy(distanceMeters, targetDistanceMeters)
  const quality = analyseRoute(shape)

  const candidate: Candidate = {
    seed,
    shape,
    distanceMeters,
    durationSeconds: trip.summary.time,
    elevationGainMeters: elevationGain(leg.elevation),
    loopiness,
    accuracy,
    repeatedRoadMeters: quality.repeatedRoadMeters,
    repeatedRoadFraction: quality.repeatedRoadFraction,
    selfIntersections: quality.selfIntersections,
    sharpTurns: quality.sharpTurns,
    uTurns: quality.uTurns,
    score: 0,
  }

  candidate.score = scoreCandidate(candidate)
  return candidate
}
