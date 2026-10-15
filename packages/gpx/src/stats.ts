import { haversineDistance } from "./haversine"
import { RawTrackpoint } from "./parser"

export type ActivityStats = {
  totalDistanceMeters: number,
  totalDurationSeconds: number,
  elevationGainMeters: number,
  elevationLossMeters: number,
  maxSpeedMps: number,
  startTime: Date | null,
  endTime: Date | null,
}

const ELEVATION_NOISE_THRESHOLD = 2 // metres — ignore changes smaller than this


export function computeTotalDistance(points: RawTrackpoint[]): number {
  if (points.length < 2) return 0

  let totalDistance = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    totalDistance += haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng)
  }
  return Math.round(totalDistance)
}


export function computeElevation(points: RawTrackpoint[]): {
  gainMeters: number
  lossMeters: number
} {
  if (points.length < 2) return { gainMeters: 0, lossMeters: 0 }

  let gain = 0
  let loss = 0

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    if (prev.ele != null && curr.ele != null) {
      const eleDiff = curr.ele - prev.ele
      if (eleDiff > ELEVATION_NOISE_THRESHOLD) {
        gain += eleDiff
      } else if (eleDiff < -ELEVATION_NOISE_THRESHOLD) {
        loss += Math.abs(eleDiff)
      }
    }
  }

  return {
    gainMeters: Math.round(gain),
    lossMeters: Math.round(loss),
  }
}


export function computeMaxSpeed(points: RawTrackpoint[]): number {
  if (points.length < 2) return 0

  let maxSpeed = 0

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    if (prev.time && curr.time) {
      const timeDiffSeconds = (curr.time.getTime() - prev.time.getTime()) / 1000
      if (timeDiffSeconds > 0) {
        const segmentDist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng)
        const segmentSpeed = segmentDist / timeDiffSeconds // m/s
        if (segmentSpeed > maxSpeed) maxSpeed = segmentSpeed
      }
    }
  }

  return parseFloat(maxSpeed.toFixed(3))
}


export function computeTimeRange(points: RawTrackpoint[]): {
  startTime: Date | null
  endTime: Date | null
} {
  if (points.length === 0) return { startTime: null, endTime: null }
  return {
    startTime: points[0].time ?? null,
    endTime: points[points.length - 1].time ?? null,
  }
}


export function computeDuration(points: RawTrackpoint[]): number {
  const { startTime, endTime } = computeTimeRange(points)
  if (!startTime || !endTime) return 0
  return Math.round((endTime.getTime() - startTime.getTime()) / 1000)
}


export function computeStats(points: RawTrackpoint[]): ActivityStats {
  const elevation = computeElevation(points)

  return {
    totalDistanceMeters: computeTotalDistance(points),
    totalDurationSeconds: computeDuration(points),
    elevationGainMeters: elevation.gainMeters,
    elevationLossMeters: elevation.lossMeters,
    maxSpeedMps: computeMaxSpeed(points),
    ...computeTimeRange(points),
  }
}