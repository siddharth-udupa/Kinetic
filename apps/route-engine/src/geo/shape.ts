import { distanceBetween } from "./point.js"
import type { GeoPoint } from "./types.js"

const EARTH_RADIUS_METERS = 6_371_000
const METERS_PER_DEGREE = (Math.PI / 180) * EARTH_RADIUS_METERS

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Shortest distance in metres from `point` to a polyline.
 *
 * Works in a local equirectangular plane centred on `point`. At city scale the
 * error is far below a metre, and it correctly measures the perpendicular
 * distance to a segment rather than only to its endpoints.
 */
export function distanceToShape(point: GeoPoint, shape: GeoPoint[]): number {
  if (shape.length === 0) return Number.POSITIVE_INFINITY
  if (shape.length === 1) return distanceBetween(point, shape[0])

  const metersPerLng = METERS_PER_DEGREE * Math.cos(toRadians(point.lat))

  function local(p: GeoPoint): { x: number; y: number } {
    return {
      x: (p.lng - point.lng) * metersPerLng,
      y: (p.lat - point.lat) * METERS_PER_DEGREE,
    }
  }

  let closest = Number.POSITIVE_INFINITY

  for (let i = 0; i < shape.length - 1; i++) {
    const a = local(shape[i])
    const b = local(shape[i + 1])
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lengthSq = dx * dx + dy * dy

    // The point itself is the origin, so the projection is -a·(b-a)/|b-a|².
    const t =
      lengthSq === 0
        ? 0
        : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSq))

    closest = Math.min(closest, Math.hypot(a.x + t * dx, a.y + t * dy))
  }

  return closest
}

/** Length of a polyline in metres. */
export function shapeLength(shape: GeoPoint[]): number {
  let total = 0
  for (let i = 1; i < shape.length; i++) {
    total += distanceBetween(shape[i - 1], shape[i])
  }
  return total
}

/**
 * Area enclosed by a shape in square metres, via the shoelace formula on a
 * local equirectangular projection at the shape's mean latitude.
 */
export function shoelaceArea(shape: GeoPoint[]): number {
  if (shape.length < 3) return 0

  const meanLat =
    shape.reduce((sum, point) => sum + point.lat, 0) / shape.length
  const meanLng =
    shape.reduce((sum, point) => sum + point.lng, 0) / shape.length
  const metersPerLng = METERS_PER_DEGREE * Math.cos(toRadians(meanLat))

  function local(p: GeoPoint): { x: number; y: number } {
    return {
      x: (p.lng - meanLng) * metersPerLng,
      y: (p.lat - meanLat) * METERS_PER_DEGREE,
    }
  }

  let twiceArea = 0
  for (let i = 0; i < shape.length; i++) {
    const a = local(shape[i])
    const b = local(shape[(i + 1) % shape.length])
    twiceArea += a.x * b.y - b.x * a.y
  }

  return Math.abs(twiceArea) / 2
}

/**
 * Polsby-Popper compactness: 1 is a circle, 0 is an out-and-back. It is a cheap
 * shape score that needs no extra routing calls.
 */
export function loopiness(areaSquareMeters: number, perimeterMeters: number): number {
  if (perimeterMeters === 0) return 0
  return (
    (4 * Math.PI * areaSquareMeters) /
    (perimeterMeters * perimeterMeters)
  )
}
