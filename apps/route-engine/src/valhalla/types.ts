export type Costing = "bicycle" | "pedestrian"

export type ValhallaLocation = {
  lat: number
  lon: number
  type?: "through"
  /** Snap search radius in metres. */
  radius?: number
  /** Give up rather than snap further than this, in metres. */
  search_cutoff?: number
}

export type ValhallaRouteRequest = {
  locations: ValhallaLocation[]
  costing: Costing
  units?: "kilometers" | "miles"
  directions_type?: "none" | "maneuvers" | "instructions"
  /** Return elevation samples at this interval, in metres. */
  elevation_interval?: number
  /** Free-form identifier echoed in Valhalla's logs. */
  id?: string
}

export type ValhallaLeg = {
  shape: string
  elevation?: number[]
}

export type ValhallaRouteResponse = {
  trip: {
    summary: {
      length: number
      time: number
      has_ferry?: boolean
    }
    legs: ValhallaLeg[]
  }
}

export type ValhallaStatus = {
  version: string
  tileset_last_modified?: number
}

export type CallOptions = {
  /** Correlates the engine log line with the Valhalla call. */
  requestId?: string
  timeoutMs?: number
}

export type RouteResult = {
  trip: ValhallaRouteResponse["trip"]
  requestId: string
  durationMs: number
}

export type StatusResult = {
  status: ValhallaStatus
  requestId: string
  durationMs: number
}
