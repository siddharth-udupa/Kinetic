import { MobileActivitySchema } from "@repo/validation"
import {
  douglasPeucker,
  encodePolyline,
  buildStreams,
  computeStats,
  type RawTrackpoint,
} from "@repo/gpx"
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  toNonNegativeInt,
  toNullableNumber,
  toNullableText,
  toValidDate,
  type NormalizedActivityData,
} from "./shared"

/** Douglas–Peucker tolerance for every track simplification. */
const SIMPLIFY_TOLERANCE = 0.0001

/** Normalises the payload posted by the mobile recorder. `MobileActivitySchema`
 *  lowercases `type` already. */
export function normalizeMobileActivity(data: unknown): NormalizedActivityData {
  const parsed = MobileActivitySchema.parse(data)

  const startTime = toValidDate(new Date(parsed.startedAt))
  const endTime = toValidDate(
    parsed.endedAt !== undefined ? new Date(parsed.endedAt) : null
  )

  let encodedPolyline: string | null = null
  let streams: NormalizedActivityData["streams"] = null
  let elevationGain = 0
  let elevationLoss = 0
  let maxSpeedMps = toNullableNumber(parsed.maxSpeedMps)

  if (parsed.points.length > 0) {
    const rawPoints: RawTrackpoint[] = parsed.points.map((point) => ({
      lat: point.latitude,
      lng: point.longitude,
      ele: point.altitude ?? null,
      time: new Date(point.timestamp),
    }))

    const stats = computeStats(rawPoints)
    const simplified = douglasPeucker(rawPoints, SIMPLIFY_TOLERANCE)

    // A single point simplifies to nothing, and an empty polyline renders as a broken map.
    if (simplified.length > 0) {
      encodedPolyline = encodePolyline(simplified) || null
    }

    streams = buildStreams(rawPoints)
    elevationGain = toNonNegativeInt(stats.elevationGainMeters)
    elevationLoss = toNonNegativeInt(stats.elevationLossMeters)
    if (maxSpeedMps === null) {
      maxSpeedMps = toNullableNumber(stats.maxSpeedMps)
    }
  }

  return {
    type: parsed.type,
    title: parsed.title.slice(0, MAX_TITLE_LENGTH),
    description: toNullableText(parsed.description, MAX_DESCRIPTION_LENGTH),
    location: null,
    distance: toNonNegativeInt(parsed.distanceMeters),
    duration: toNonNegativeInt(parsed.durationSeconds),
    elevationGain,
    elevationLoss,
    encodedPolyline,
    maxSpeedMps,
    startTime,
    endTime,
    streams,
  }
}
