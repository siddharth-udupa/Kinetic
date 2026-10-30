import type { RouteProfile } from "@repo/validation"
import {
  decodePolyline6,
  destination,
  distanceToShape,
  loopiness as shapeLoopiness,
  shapeLength,
  shoelaceArea,
  type GeoPoint,
} from "../geo/index.js"
import { route } from "../valhalla/index.js"
import { canCall, remainingBudgetMs } from "./budget.js"
import {
  CORRECTION_RADIUS_MAX,
  CORRECTION_RADIUS_MIN,
  DEFAULT_ATTEMPT_TIMEOUT_MS,
  MAX_VIA_DISTANCE_METERS,
  MIN_ATTEMPT_TIMEOUT_MS,
  MIN_ROUTE_LENGTH_RATIO,
} from "./config.js"
import { distanceAccuracy, elevationGain, scoreCandidate } from "./metrics.js"
import { buildTriangleRequest } from "./request.js"
import type { Budget, Candidate } from "./types.js"

export type CandidateContext = {
  origin: GeoPoint
  profile: RouteProfile
  targetDistanceMeters: number
  requestId: string
  budget: Budget
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Routes one triangle and scores it. Returns `null` when the candidate is not
 * a loop we are willing to show: a ferry crossing, a via that snapped far from
 * where it was asked to be, or a route shorter than half the target.
 */
export async function routeCandidate(
  context: CandidateContext,
  bearing: number,
  radius: number
): Promise<Candidate | null> {
  const {
    origin,
    profile,
    targetDistanceMeters,
    requestId,
    budget,
  } = context

  if (!canCall(budget)) return null

  const first = destination(origin, bearing, radius)
  const second = destination(origin, bearing + 120, radius)
  const timeoutMs = Math.min(
    DEFAULT_ATTEMPT_TIMEOUT_MS,
    remainingBudgetMs(budget)
  )

  if (timeoutMs < MIN_ATTEMPT_TIMEOUT_MS) return null

  budget.calls += 1
  const { trip } = await route(
    buildTriangleRequest(origin, first, second, profile, requestId),
    { requestId, timeoutMs }
  )

  const leg = trip.legs[0]
  if (!leg || typeof leg.shape !== "string") return null

  const shape = decodePolyline6(leg.shape)
  if (shape.length < 2) return null

  const measuredLength = shapeLength(shape)
  const summaryLength = trip.summary.length * 1_000
  const distanceMeters =
    summaryLength > 0 && Number.isFinite(summaryLength)
      ? summaryLength
      : measuredLength

  if (distanceMeters < targetDistanceMeters * MIN_ROUTE_LENGTH_RATIO) {
    return null
  }
  if (trip.summary.has_ferry) return null

  const viaDistances = [
    distanceToShape(first, shape),
    distanceToShape(second, shape),
  ]
  if (viaDistances.some((distance) => distance > MAX_VIA_DISTANCE_METERS)) {
    return null
  }

  const loopiness = shapeLoopiness(shoelaceArea(shape), measuredLength)
  const accuracy = distanceAccuracy(distanceMeters, targetDistanceMeters)

  return {
    bearing,
    radius,
    shape,
    distanceMeters,
    durationSeconds: trip.summary.time,
    elevationGainMeters: elevationGain(leg.elevation),
    loopiness,
    accuracy,
    score: scoreCandidate(accuracy, loopiness),
  }
}

/** Scale the triangle radius by how far its route missed the target. */
export function correctionRadius(
  candidate: Candidate,
  targetDistanceMeters: number
): number {
  return (
    candidate.radius *
    clamp(
      targetDistanceMeters / candidate.distanceMeters,
      CORRECTION_RADIUS_MIN,
      CORRECTION_RADIUS_MAX
    )
  )
}
