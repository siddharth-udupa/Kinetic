import { ValhallaError } from "../valhalla/index.js"
import { stopBudget } from "./budget.js"
import { correctionRadius, routeCandidate, type CandidateContext } from "./candidate.js"
import { MAX_CORRECTIONS, TARGET_TOLERANCE } from "./config.js"
import type { Candidate } from "./types.js"

const START_OFFSETS = [0, 90, 180, 270] as const

function isFatal(error: unknown): boolean {
  return (
    error instanceof ValhallaError &&
    (error.code === "timeout" || error.code === "unreachable")
  )
}

export type InitialSearch = {
  candidates: Candidate[]
  stoppedEarly: boolean
}

/**
 * Route the four rotated triangles concurrently. They are independent, so
 * waiting for one before starting the next only adds latency.
 */
export async function findInitialCandidates(
  context: CandidateContext,
  startBearing: number,
  radius: number
): Promise<InitialSearch> {
  const results = await Promise.allSettled(
    START_OFFSETS.map((offset) =>
      routeCandidate(context, (startBearing + offset) % 360, radius)
    )
  )

  const candidates: Candidate[] = []
  let fatalError: unknown

  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value) candidates.push(result.value)
    } else if (isFatal(result.reason)) {
      fatalError ??= result.reason
    }
  }

  if (fatalError !== undefined) {
    // A transport failure will fail every remaining candidate too.
    if (candidates.length === 0) throw fatalError
    stopBudget(context.budget)
    return { candidates, stoppedEarly: true }
  }

  return { candidates, stoppedEarly: false }
}

export type CorrectionOutcome = {
  best: Candidate
  stoppedEarly: boolean
}

/**
 * Grow or shrink one candidate until it lands inside the target band, keeping
 * the best shape seen along the way. A non-fatal Valhalla error only ends this
 * candidate; a fatal one ends the whole search.
 */
export async function correctCandidate(
  context: CandidateContext,
  contender: Candidate,
  best: Candidate
): Promise<CorrectionOutcome> {
  let bestSoFar = best
  let current = contender

  function consider(candidate: Candidate): void {
    if (candidate.score < bestSoFar.score) bestSoFar = candidate
  }

  consider(current)

  for (
    let correction = 0;
    correction < MAX_CORRECTIONS && current.accuracy > TARGET_TOLERANCE;
    correction++
  ) {
    try {
      const corrected = await routeCandidate(
        context,
        current.bearing,
        correctionRadius(current, context.targetDistanceMeters)
      )

      if (!corrected) break

      current = corrected
      consider(corrected)
    } catch (error) {
      if (isFatal(error)) {
        stopBudget(context.budget)
        return { best: bestSoFar, stoppedEarly: true }
      }
      break
    }
  }

  return { best: bestSoFar, stoppedEarly: false }
}
