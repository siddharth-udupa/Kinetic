import { haversineDistance } from "@repo/gpx"
import type { GeoPoint } from "./types.js"

const EARTH_RADIUS_METERS = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

/** Wraps a longitude back into [-180, 180). */
function normalizeLongitude(lng: number): number {
  return ((lng + 540) % 360) - 180
}

/** Great-circle distance in metres. */
export function distanceBetween(a: GeoPoint, b: GeoPoint): number {
  return haversineDistance(a.lat, a.lng, b.lat, b.lng)
}

/**
 * The point reached by travelling `distanceMeters` from `origin` along a
 * great-circle path at `bearingDegrees` (0 = north, 90 = east).
 */
export function destination(
  origin: GeoPoint,
  bearingDegrees: number,
  distanceMeters: number
): GeoPoint {
  const bearing = toRadians(bearingDegrees)
  const angular = distanceMeters / EARTH_RADIUS_METERS
  const lat1 = toRadians(origin.lat)
  const lng1 = toRadians(origin.lng)

  const sinLat2 =
    Math.sin(lat1) * Math.cos(angular) +
    Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing)

  // Clamp before asin: rounding can push a value a hair outside [-1, 1].
  const lat2 = Math.asin(Math.max(-1, Math.min(1, sinLat2)))
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * sinLat2
    )

  return {
    lat: toDegrees(lat2),
    lng: normalizeLongitude(toDegrees(lng2)),
  }
}
