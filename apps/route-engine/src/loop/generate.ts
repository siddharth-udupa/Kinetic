import { randomInt } from "node:crypto"
import { encodePolyline } from "@repo/gpx"
import type { LoopRequest, LoopResponse, LoopRoute } from "@repo/validation"
import { createBudget } from "./budget.js"
import {
  ACCURACY_WARNING_THRESHOLD,
  CANDIDATE_COUNT,
  COMPACTNESS_WARNING_THRESHOLD,
  MAX_DISTANCE_METERS,
  MIN_DISTANCE_METERS,
  REPEATED_ROAD_WARNING_THRESHOLD,
  clampDistance,
} from "./config.js"
import { LoopError } from "./errors.js"
import { isUsableFallback } from "./quality.js"
import { mulberry32, resolveSeed } from "./random.js"
import { searchLoops, type LoopSearchResult } from "./search.js"
import type { Candidate } from "./types.js"

const STOPPED_EARLY_WARNING =
  "Stopped early; returning the best loops found so far."
const NO_CLEAN_WARNING =
  "No loop met every quality check; returning the closest usable match."

export type LoopDiagnostics = {
  candidateCount: number
  routedCount: number
  acceptedCount: number
  returnedCount: number
  refinedCount: number
  fallback: boolean
  stoppedEarly: boolean
  rejectionCounts: LoopSearchResult["rejectionCounts"]
}

export type GenerateLoopOptions = {
  requestId?: string
  /** Test hook; production always uses `CANDIDATE_COUNT`. */
  candidateCount?: number
  onDiagnostics?: (stats: LoopDiagnostics) => void
}

function toRoute(candidate: Candidate, rank: number): LoopRoute {
  return {
    rank,
    distanceMeters: Math.round(candidate.distanceMeters),
    durationSeconds: Math.round(candidate.durationSeconds),
    elevationGainMeters: candidate.elevationGainMeters,
    accuracy: Number(candidate.accuracy.toFixed(4)),
    loopiness: Number(candidate.loopiness.toFixed(4)),
    repeatedRoadPercent: Number(
      (candidate.repeatedRoadFraction * 100).toFixed(1)
    ),
    repeatedRoadMeters: Math.round(candidate.repeatedRoadMeters),
    selfIntersections: candidate.selfIntersections,
    sharpTurns: candidate.sharpTurns,
    uTurns: candidate.uTurns,
    score: Number(candidate.score.toFixed(4)),
    polyline: encodePolyline(candidate.shape),
  }
}

export async function generateLoop(
  input: LoopRequest,
  options: GenerateLoopOptions = {}
): Promise<LoopResponse> {
  const requestId =
    options.requestId ?? `loop_${randomInt(0, 4_294_967_296)}`
  const targetDistanceMeters = clampDistance(input.distanceMeters)
  const seed = resolveSeed(input.seed)
  const random = mulberry32(seed)
  const warnings: string[] = []

  function warn(message: string): void {
    if (!warnings.includes(message)) warnings.push(message)
  }

  if (targetDistanceMeters !== input.distanceMeters) {
    warn(
      `Distance was clamped to the supported ${MIN_DISTANCE_METERS / 1_000}–${MAX_DISTANCE_METERS / 1_000} km range.`
    )
  }

  const search = await searchLoops(
    {
      origin: { lat: input.origin.lat, lng: input.origin.lon },
      profile: input.profile,
      targetDistanceMeters,
      requestId,
      budget: createBudget(),
    },
    random,
    options.candidateCount ?? CANDIDATE_COUNT
  )

  if (search.stoppedEarly) warn(STOPPED_EARLY_WARNING)

  const selected = search.accepted.slice(0, 3)
  let fallback = false

  if (selected.length === 0) {
    const usable = search.ranked.find(isUsableFallback)
    if (usable) {
      selected.push(usable)
      fallback = true
      warn(NO_CLEAN_WARNING)
    }
  }

  if (selected.length === 0) {
    throw new LoopError(
      "Could not build a usable loop from this start point. Try a different distance or profile."
    )
  }

  if (!fallback && selected.length < 3) {
    warn(
      `Only ${selected.length} clean loop${selected.length === 1 ? "" : "s"} could be built from this start point.`
    )
  }

  const best = selected[0]

  if (best.accuracy > ACCURACY_WARNING_THRESHOLD) {
    warn(
      `Closest loop is ${Math.round(best.accuracy * 100)}% away from the requested distance.`
    )
  }

  if (best.repeatedRoadFraction > REPEATED_ROAD_WARNING_THRESHOLD) {
    warn("The best loop repeats some of the same road.")
  }

  if (best.loopiness < COMPACTNESS_WARNING_THRESHOLD) {
    warn("The best loop is less rounded than usual.")
  }

  if (best.selfIntersections > 0) {
    warn("The best loop crosses itself.")
  }

  const routes = selected.map((candidate, index) =>
    toRoute(candidate, index + 1)
  )

  options.onDiagnostics?.({
    candidateCount: search.candidateCount,
    routedCount: search.routedCount,
    acceptedCount: search.accepted.length,
    returnedCount: routes.length,
    refinedCount: search.refinedCount,
    fallback,
    stoppedEarly: search.stoppedEarly,
    rejectionCounts: search.rejectionCounts,
  })

  return {
    seed,
    profile: input.profile,
    requestedDistanceMeters: targetDistanceMeters,
    // The best route is mirrored at the top level so clients that only render
    // one loop keep working while the UI moves to the ranked `routes` list.
    distanceMeters: routes[0].distanceMeters,
    durationSeconds: routes[0].durationSeconds,
    elevationGainMeters: routes[0].elevationGainMeters,
    accuracy: routes[0].accuracy,
    loopiness: routes[0].loopiness,
    polyline: routes[0].polyline,
    routes,
    warnings,
  }
}
