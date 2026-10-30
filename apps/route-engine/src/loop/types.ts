import type { GeoPoint } from "../geo/index.js"

export type Candidate = {
  bearing: number
  radius: number
  shape: GeoPoint[]
  distanceMeters: number
  durationSeconds: number
  elevationGainMeters: number
  loopiness: number
  accuracy: number
  score: number
}

export type Budget = {
  calls: number
  deadline: number
}
