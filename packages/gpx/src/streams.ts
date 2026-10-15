import { RawTrackpoint } from "./parser"
import { haversineDistance } from "./haversine"
import { ActivityStreams } from "@repo/types"

/**
 * Builds the time-series arrays stored in `activity_streams`: elevation charts, pace graphs, splits.
 */
export function buildStreams(points: RawTrackpoint[]): ActivityStreams {
  const time: number[] = []
  const distance: number[] = []
  const altitude: number[] = []
  const lat: number[] = []
  const lng: number[] = []
  const speed: number[] = []

  const startTime = points[0]?.time?.getTime() ?? 0
  let cumulativeDistance = 0

  for (let i = 0; i < points.length; i++) {
    const p = points[i]

    const t = p.time ? (p.time.getTime() - startTime) / 1000 : i
    time.push(Math.round(t))

    if (i > 0) {
      const prev = points[i - 1]
      cumulativeDistance += haversineDistance(prev.lat, prev.lng, p.lat, p.lng)
    }
    distance.push(Math.round(cumulativeDistance))

    altitude.push(p.ele ?? 0)

    lat.push(p.lat)
    lng.push(p.lng)

    if (i === 0) {
      speed.push(0)
    } else {
      const prev = points[i - 1]
      const segDist = haversineDistance(prev.lat, prev.lng, p.lat, p.lng)
      const segTime =
        prev.time && p.time
          ? (p.time.getTime() - prev.time.getTime()) / 1000
          : 1
      speed.push(segTime > 0 ? parseFloat((segDist / segTime).toFixed(3)) : 0)
    }
  }

  return { timeData: time, distanceData: distance, altitudeData: altitude, speedData: speed }
}