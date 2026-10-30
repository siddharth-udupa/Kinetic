import type { RouteProfile } from "@repo/validation"
import type { GeoPoint } from "../geo/index.js"
import type { Costing, ValhallaRouteRequest } from "../valhalla/index.js"
import { SEARCH_CUTOFF_METERS, THROUGH_RADIUS_METERS } from "./config.js"

function profileCosting(profile: RouteProfile): Costing {
  return profile === "bike" ? "bicycle" : "pedestrian"
}

export function buildTriangleRequest(
  origin: GeoPoint,
  first: GeoPoint,
  second: GeoPoint,
  profile: RouteProfile,
  id: string
): ValhallaRouteRequest {
  return {
    locations: [
      { lat: origin.lat, lon: origin.lng },
      {
        lat: first.lat,
        lon: first.lng,
        type: "through",
        radius: THROUGH_RADIUS_METERS,
        search_cutoff: SEARCH_CUTOFF_METERS,
      },
      {
        lat: second.lat,
        lon: second.lng,
        type: "through",
        radius: THROUGH_RADIUS_METERS,
        search_cutoff: SEARCH_CUTOFF_METERS,
      },
      { lat: origin.lat, lon: origin.lng },
    ],
    costing: profileCosting(profile),
    units: "kilometers",
    directions_type: "none",
    elevation_interval: 30,
    id,
  }
}
