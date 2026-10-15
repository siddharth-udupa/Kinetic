import type { ActivityStreams, ActivityTypes } from "@repo/types"

export const MAX_TITLE_LENGTH = 100
export const MAX_DESCRIPTION_LENGTH = 1000

/** What every `normalize*Activity` returns: `activitiesInsertType` minus the
 *  server-owned fields. Missing optionals are `null`, never `undefined`. */
export type NormalizedActivityData = {
  type: ActivityTypes
  title: string
  description: string | null
  location: string | null
  distance: number
  duration: number
  elevationGain: number
  elevationLoss: number
  encodedPolyline: string | null
  maxSpeedMps: number | null
  startTime: Date | null
  endTime: Date | null
  streams: ActivityStreams | null
}

/** Client input that cannot become an activity. Any other throw is a server bug (500). */
export class NormalizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NormalizationError"
  }
}

/** Coerce to a non-negative integer, defaulting to 0. */
export function toNonNegativeInt(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0
  return Math.round(value)
}

/** Keep a finite non-negative number, or `null`. */
export function toNullableNumber(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null
  return value
}

/** Trim, collapse empty strings to `null`, and cap the length. */
export function toNullableText(
  value: string | null | undefined,
  maxLength: number
): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

/** An unparseable date becomes `null`, never an `Invalid Date`, which the
 *  Postgres driver rejects at INSERT. */
export function toValidDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
