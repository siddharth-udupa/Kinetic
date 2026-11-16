import type { GeoPoint } from "../geo/index.js"

/** One control point of a loop. `bearing` and `radiusMeters` are kept so a
 *  candidate can be scaled for a distance correction without regenerating it. */
export type CandidateVia = {
  bearing: number
  radiusMeters: number
  point: GeoPoint
}

export type CandidateSeed = {
  id: string
  template: string
  /** Bearing of the first control point, before the sweep is applied. */
  bearing: number
  sweepDegrees: number
  radiusMeters: number
  vias: CandidateVia[]
  /** 1 for the first pass, scaled by a distance correction afterwards. */
  correction: number
}

export type RouteQuality = {
  repeatedRoadMeters: number
  repeatedRoadFraction: number
  selfIntersections: number
  sharpTurns: number
  uTurns: number
}

export type Candidate = {
  seed: CandidateSeed
  shape: GeoPoint[]
  distanceMeters: number
  durationSeconds: number
  elevationGainMeters: number
  /** Polsby-Popper compactness: 1 is a circle, 0 is an out-and-back. */
  loopiness: number
  /** |actual − requested| / requested. 0 is perfect. */
  accuracy: number
  repeatedRoadMeters: number
  repeatedRoadFraction: number
  selfIntersections: number
  sharpTurns: number
  uTurns: number
  /** Lower is better. Only meaningful once the quality gates have passed. */
  score: number
}

export type Budget = {
  calls: number
  deadline: number
}
