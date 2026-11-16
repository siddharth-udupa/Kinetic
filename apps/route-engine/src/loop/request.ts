import type { RouteProfile } from "@repo/validation"
import type { GeoPoint } from "../geo/index.js"
import type { Costing, ValhallaRouteRequest } from "../valhalla/index.js"
import {
  SEARCH_CUTOFF_MAX_METERS,
  SEARCH_CUTOFF_MIN_METERS,
  SEARCH_CUTOFF_RATIO,
  THROUGH_RADIUS_MAX_METERS,
  THROUGH_RADIUS_MIN_METERS,
  THROUGH_RADIUS_RATIO,
} from "./config.js"
import type { CandidateSeed } from "./types.js"

function profileCosting(profile: RouteProfile): Costing {
  return profile === "bike" ? "bicycle" : "pedestrian"
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Snap radius for a via. Proportional to the loop so a small loop does not
 *  get a control point thrown hundreds of metres onto another road. */
export function throughRadiusFor(seed: CandidateSeed): number {
  return Math.round(
    clamp(
      seed.radiusMeters * THROUGH_RADIUS_RATIO,
      THROUGH_RADIUS_MIN_METERS,
      THROUGH_RADIUS_MAX_METERS
    )
  )
}

export function searchCutoffFor(seed: CandidateSeed): number {
  return Math.round(
    clamp(
      throughRadiusFor(seed) * SEARCH_CUTOFF_RATIO,
      SEARCH_CUTOFF_MIN_METERS,
      SEARCH_CUTOFF_MAX_METERS
    )
  )
}

export function buildLoopRequest(
  seed: CandidateSeed,
  origin: GeoPoint,
  profile: RouteProfile,
  id: string
): ValhallaRouteRequest {
  const radius = throughRadiusFor(seed)
  const searchCutoff = searchCutoffFor(seed)

  return {
    locations: [
      { lat: origin.lat, lon: origin.lng },
      ...seed.vias.map((via) => ({
        lat: via.point.lat,
        lon: via.point.lng,
        type: "through" as const,
        radius,
        search_cutoff: searchCutoff,
      })),
      { lat: origin.lat, lon: origin.lng },
    ],
    costing: profileCosting(profile),
    units: "kilometers",
    directions_type: "none",
    elevation_interval: 30,
    id,
  }
}
