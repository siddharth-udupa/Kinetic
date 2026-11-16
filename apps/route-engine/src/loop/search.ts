import { ValhallaError } from "../valhalla/index.js"
import { canCall, stopBudget } from "./budget.js"
import { routeCandidate, type CandidateContext } from "./candidate.js"
import {
  CANDIDATE_CONCURRENCY,
  CORRECTION_RADIUS_MAX,
  CORRECTION_RADIUS_MIN,
  MAX_CORRECTIONS,
  MAX_REFINE_DISTANCE_ERROR,
  TARGET_TOLERANCE,
} from "./config.js"
import {
  rejectionCodes,
  routesLookAlike,
  type RejectionCode,
} from "./quality.js"
import { generateCandidateSeeds, scaleSeed } from "./shapes.js"
import type { Candidate, CandidateSeed } from "./types.js"

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function isFatal(error: unknown): boolean {
  return error instanceof ValhallaError && error.code === "unreachable"
}

/**
 * A failure that says something about Valhalla rather than about this seed.
 * A `400` for a bad via is not one: the server answered and the next seed can
 * still succeed. Repeated transport failures are what a rate-limited or
 * overloaded instance looks like, and continuing merely burns the budget.
 */
function isTransportFailure(error: unknown): error is ValhallaError {
  if (!(error instanceof ValhallaError)) return false
  if (error.code === "http") {
    // Valhalla returns 400 when it cannot route one seed's via. Anything else
    // (rate limiting, auth, a wrong URL, a 5xx) says the service itself is in
    // trouble, and repeating it 30 times only spends the budget.
    return error.statusCode !== 400
  }
  return (
    error.code === "timeout" ||
    error.code === "unreachable" ||
    error.code === "invalid_response"
  )
}

function compareCandidates(a: Candidate, b: Candidate): number {
  return (
    a.score - b.score ||
    a.accuracy - b.accuracy ||
    a.repeatedRoadFraction - b.repeatedRoadFraction ||
    a.seed.id.localeCompare(b.seed.id)
  )
}

function distinct(candidates: Candidate[]): Candidate[] {
  const result: Candidate[] = []
  for (const candidate of candidates) {
    if (!result.some((existing) => routesLookAlike(existing, candidate))) {
      result.push(candidate)
    }
  }
  return result
}

type RouteBatch = {
  candidates: Candidate[]
  stoppedEarly: boolean
}

/**
 * Routes seeds with a small worker pool. A fatal transport error stops new
 * calls but keeps whatever completed, because the ranking can still use them.
 * A full wave of transport failures means the instance itself is unhealthy, so
 * the batch stops and the error surfaces as a `502` instead of a misleading
 * `no_candidate` after the whole budget has been spent.
 */
async function routeSeeds(
  context: CandidateContext,
  seeds: CandidateSeed[]
): Promise<RouteBatch> {
  const candidates: Candidate[] = []
  let stoppedEarly = false
  let fatal: unknown
  let failed: unknown
  let circuitBroken: ValhallaError | undefined
  let lastTransportFailure: ValhallaError | undefined
  let consecutiveTransportFailures = 0
  let nextIndex = 0
  const failureLimit = Math.min(CANDIDATE_CONCURRENCY, seeds.length)

  async function worker(): Promise<void> {
    while (true) {
      if (
        fatal !== undefined ||
        failed !== undefined ||
        circuitBroken !== undefined
      ) {
        return
      }

      const index = nextIndex++
      if (index >= seeds.length) return

      if (!canCall(context.budget)) {
        stoppedEarly = true
        return
      }

      try {
        const candidate = await routeCandidate(context, seeds[index])
        consecutiveTransportFailures = 0
        if (candidate) {
          candidates.push(candidate)
        } else if (!canCall(context.budget)) {
          stoppedEarly = true
          return
        }
      } catch (error) {
        if (isFatal(error)) {
          fatal = error
          stoppedEarly = true
          stopBudget(context.budget)
          return
        }
        // Unexpected errors are bugs, not a bad seed; surface them.
        if (!(error instanceof ValhallaError)) {
          failed = error
          stoppedEarly = true
          stopBudget(context.budget)
          return
        }
        // Valhalla answered with a rejection for this seed (a bad via, an
        // unroutable waypoint) rather than failing as a service.
        if (!isTransportFailure(error)) {
          consecutiveTransportFailures = 0
          continue
        }

        lastTransportFailure = error
        consecutiveTransportFailures += 1
        if (consecutiveTransportFailures >= failureLimit) {
          circuitBroken = error
          stoppedEarly = true
          stopBudget(context.budget)
          return
        }
      }
    }
  }

  const workerCount = Math.min(CANDIDATE_CONCURRENCY, seeds.length)
  await Promise.all(
    Array.from({ length: workerCount }, () => worker())
  )

  if (failed !== undefined) throw failed
  if (circuitBroken !== undefined) throw circuitBroken
  if (candidates.length === 0) {
    if (fatal !== undefined) throw fatal
    if (lastTransportFailure !== undefined) throw lastTransportFailure
  }

  return { candidates, stoppedEarly }
}

export type LoopSearchResult = {
  /** Every routed candidate, best score first, including rejected ones. */
  ranked: Candidate[]
  /** Clean, distinct candidates that passed every gate, best first. */
  accepted: Candidate[]
  candidateCount: number
  routedCount: number
  refinedCount: number
  stoppedEarly: boolean
  rejectionCounts: Record<RejectionCode, number>
}

function emptyRejectionCounts(): Record<RejectionCode, number> {
  return {
    distance: 0,
    overlap: 0,
    self_intersection: 0,
    compactness: 0,
    turns: 0,
  }
}

/**
 * Generates 30 loop shapes, routes them all, measures each one, then refines
 * the distance of a few otherwise-clean near misses. The caller only sees the
 * candidates that cleared the quality gates, ranked by `score`.
 */
export async function searchLoops(
  context: CandidateContext,
  random: () => number,
  candidateCount: number
): Promise<LoopSearchResult> {
  const seeds = generateCandidateSeeds(
    context.origin,
    context.targetDistanceMeters,
    candidateCount,
    random
  )
  const initial = await routeSeeds(context, seeds)
  const candidates = [...initial.candidates]
  let stoppedEarly = initial.stoppedEarly
  let refinedCount = 0

  const codes = new Map<Candidate, RejectionCode[]>()

  function evaluate(): void {
    codes.clear()
    for (const candidate of candidates) {
      codes.set(candidate, rejectionCodes(candidate))
    }
  }

  function acceptedCandidates(): Candidate[] {
    return candidates
      .filter((candidate) => (codes.get(candidate)?.length ?? 1) === 0)
      .sort(compareCandidates)
  }

  evaluate()
  const beforeRefinement = acceptedCandidates()
  const distinctBeforeRefinement = distinct(beforeRefinement)

  const needsRefinement =
    canCall(context.budget) &&
    (distinctBeforeRefinement.length < 3 ||
      distinctBeforeRefinement
        .slice(0, 3)
        .some((candidate) => candidate.accuracy > TARGET_TOLERANCE))

  if (needsRefinement) {
    const targets = candidates
      .filter((candidate) => candidate.seed.correction === 1)
      .filter((candidate) => {
        if (candidate.accuracy <= TARGET_TOLERANCE) return false
        if (candidate.accuracy > MAX_REFINE_DISTANCE_ERROR) return false

        const reasons = codes.get(candidate) ?? []
        return reasons.every((reason) => reason === "distance")
      })
      .sort(
        (a, b) =>
          a.accuracy - b.accuracy ||
          a.score - b.score ||
          a.seed.id.localeCompare(b.seed.id)
      )
      .slice(0, MAX_CORRECTIONS)

    const refinedSeeds = targets.flatMap((candidate) => {
      const factor = clamp(
        context.targetDistanceMeters / candidate.distanceMeters,
        CORRECTION_RADIUS_MIN,
        CORRECTION_RADIUS_MAX
      )

      // Scaling by a hair only produces a duplicate of the same route.
      if (Math.abs(factor - 1) < 0.02) return []

      return [scaleSeed(context.origin, candidate.seed, factor)]
    })

    if (refinedSeeds.length > 0) {
      try {
        const refined = await routeSeeds(context, refinedSeeds)
        refinedCount = refinedSeeds.length
        candidates.push(...refined.candidates)
        stoppedEarly ||= refined.stoppedEarly
        evaluate()
      } catch (error) {
        // Refinement is optional. If Valhalla falters here, keep the initial
        // candidates that already routed instead of failing the whole request.
        if (!isTransportFailure(error)) throw error
        stoppedEarly = true
        stopBudget(context.budget)
      }
    }
  }

  const ranked = [...candidates].sort(compareCandidates)
  const accepted = distinct(
    ranked.filter((candidate) => (codes.get(candidate)?.length ?? 1) === 0)
  )

  const rejectionCounts = emptyRejectionCounts()
  for (const candidate of candidates) {
    for (const code of codes.get(candidate) ?? []) {
      rejectionCounts[code]++
    }
  }

  return {
    ranked,
    accepted,
    candidateCount: seeds.length,
    routedCount: candidates.length,
    refinedCount,
    stoppedEarly,
    rejectionCounts,
  }
}
