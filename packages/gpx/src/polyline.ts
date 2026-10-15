/**
 * Encodes coordinates as a Google Polyline string: scale to 1e5 integers, delta against
 * the previous point, zigzag, then 5-bit chunks with a continuation bit and a +63 offset.
 */
export function encodePolyline(
  points: Array<{ lat: number; lng: number }>
): string {
  let output = ""
  let prevLat = 0
  let prevLng = 0

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5)
    const lng = Math.round(point.lng * 1e5)

    output += encodeValue(lat - prevLat)
    output += encodeValue(lng - prevLng)

    prevLat = lat
    prevLng = lng
  }

  return output
}

function encodeValue(value: number): string {
  // Zigzag: negatives become odd, positives become even.
  let v = value < 0 ? ~(value << 1) : value << 1
  let result = ""

  while (v >= 0x20) {
    result += String.fromCharCode(((0x20 | (v & 0x1f)) + 63))
    v >>= 5
  }
  result += String.fromCharCode(v + 63)
  return result
}

/** Decodes a Google Polyline string back into coordinates. */
export function decodePolyline(
  encoded: string
): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let result = 0
    let shift = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dLat

    result = 0
    shift = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dLng

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
}