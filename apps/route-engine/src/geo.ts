const EARTH_RADIUS_METERS = 6_371_000
const METERS_PER_DEGREE = (Math.PI / 180) * EARTH_RADIUS_METERS

export type GeoPoint = {
  lat: number
  lng: number
}

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
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)))
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

/**
 * Decodes Valhalla's native `shape` field, which is a Google-encoded polyline
 * at 1e6 precision. `@repo/gpx` encodes at 1e5, so it cannot be reused here.
 */
export function decodePolyline6(encoded: string): GeoPoint[] {
  const points: GeoPoint[] = []
  let index = 0
  let lat = 0
  let lng = 0

  function readValue(): number {
    let result = 0
    let shift = 0
    let byte: number

    do {
      if (index >= encoded.length) {
        throw new Error("Truncated polyline6 string")
      }
      byte = encoded.charCodeAt(index++) - 63
      if (byte < 0) {
        throw new Error("Invalid character in polyline6 string")
      }
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    return result & 1 ? ~(result >> 1) : result >> 1
  }

  while (index < encoded.length) {
    lat += readValue()
    lng += readValue()
    points.push({ lat: lat / 1e6, lng: lng / 1e6 })
  }

  return points
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
