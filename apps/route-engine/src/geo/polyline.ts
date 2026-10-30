import type { GeoPoint } from "./types.js"

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
