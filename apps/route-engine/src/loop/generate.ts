import { randomInt } from "node:crypto"
import { encodePolyline } from "@repo/gpx"
import type { LoopRequest, LoopResponse } from "@repo/validation"
import { createBudget } from "./budget.js"
import {
  ACCURACY_WARNING_THRESHOLD,
  clampDistance,
  DETOUR_FACTOR,
  LOOPINESS_WARNING_THRESHOLD,
  MAX_DISTANCE_METERS,
  MIN_DISTANCE_METERS,
  TARGET_TOLERANCE,
} from "./config.js"
import { LoopError } from "./errors.js"
import { mulberry32, resolveSeed } from "./random.js"
import { correctCandidate, findInitialCandidates } from "./search.js"

const STOPPED_EARLY_WARNING =
  "Stopped early; returning the best loop found so far."

export async function generateLoop(
  input: LoopRequest,
  options: { requestId?: string } = {}
): Promise<LoopResponse> {
  const requestId = options.requestId ?? `loop_${randomInt(0, 4_294_967_296)}`
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

  const context = {
    origin: { lat: input.origin.lat, lng: input.origin.lon },
    profile: input.profile,
    targetDistanceMeters,
    requestId,
    budget: createBudget(),
  }

  const startBearing = random() * 360
  const radius =
    targetDistanceMeters / (3 * Math.sqrt(3) * DETOUR_FACTOR)

  const initial = await findInitialCandidates(context, startBearing, radius)
  if (initial.stoppedEarly) warn(STOPPED_EARLY_WARNING)

  if (initial.candidates.length === 0) {
    throw new LoopError(
      "Could not build a loop from this start point. Try a different distance or profile."
    )
  }

  initial.candidates.sort((a, b) => a.score - b.score)
  let best = initial.candidates[0]

  // Stop as soon as the best shape is inside the band. Correcting a runner-up
  // while the winner already satisfies the target only spends Valhalla calls.
  for (const contender of initial.candidates.slice(0, 2)) {
    if (best.accuracy <= TARGET_TOLERANCE) break

    const outcome = await correctCandidate(context, contender, best)
    best = outcome.best

    if (outcome.stoppedEarly) {
      warn(STOPPED_EARLY_WARNING)
      break
    }
  }

  if (best.accuracy > ACCURACY_WARNING_THRESHOLD) {
    warn(
      `Closest loop is ${Math.round(best.accuracy * 100)}% away from the requested distance.`
    )
  }

  if (best.loopiness < LOOPINESS_WARNING_THRESHOLD) {
    warn("The loop doubles back on itself.")
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
    polyline: encodePolyline(best.shape),
    warnings,
  }
}
