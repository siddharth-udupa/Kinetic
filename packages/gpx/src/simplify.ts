import { RawTrackpoint } from "./parser"

function perpendicularDistance(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dx = b.lng - a.lng
  const dy = b.lat - a.lat
  const lineLenSq = dx * dx + dy * dy

  if (lineLenSq === 0) {
    // Degenerate segment: return the distance to a and skip the division.
    const ex = p.lng - a.lng
    const ey = p.lat - a.lat
    return Math.sqrt(ex * ex + ey * ey)
  }

  // Projection onto the line, clamped to the segment.
  const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lineLenSq))
  const closestLng = a.lng + t * dx
  const closestLat = a.lat + t * dy
  const ex = p.lng - closestLng
  const ey = p.lat - closestLat

  return Math.sqrt(ex * ex + ey * ey)
}


/**
 * Douglas-Peucker simplification. Epsilon is in degrees: 0.0001 ≈ 10m for previews,
 * 0.001 ≈ 100m for thumbnails, 0.00001 keeps every point.
 */
export function douglasPeucker(
  points: RawTrackpoint[],
  epsilon: number = 0.0001
): RawTrackpoint[] {
  if (points.length <= 2) return points

  let maxDist = 0
  let maxIndex = 0
  const start = points[0]
  const end = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end)
    if (dist > maxDist) {
      maxDist = dist
      maxIndex = i
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon)
    const right = douglasPeucker(points.slice(maxIndex), epsilon)
    // Both halves end and start on the same point. Drop the duplicate.
    return [...left.slice(0, -1), ...right]
  }
  
  return [start, end]
}