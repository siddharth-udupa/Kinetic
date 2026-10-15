import type {
  activitiesType,
  activityStreamsInsertType,
  getActivityDetails,
  ActivityType,
} from "@repo/db"

export type ActivityCardType = activitiesType

export type ActivityStreams = Omit<activityStreamsInsertType, "id" | "activityId" | "createdAt">

export type ActivityDetailsType = NonNullable<Awaited<ReturnType<typeof getActivityDetails>>>

export type ActivityPoint = {
  latitude: number
  longitude: number
  altitude: number | null
  speed: number | null
  accuracy: number | null
  timestamp: number
}

export type ActivitySummary = {
  id: string
  type: ActivityTypes
  title: string
  description?: string
  startedAt: number
  endedAt?: number
  distanceMeters: number
  durationSeconds: number
  movingTimeSeconds: number
  avgSpeedMps: number
  maxSpeedMps: number
  points: ActivityPoint[]
}

// Derived from the drizzle pgEnum, a type-only import so nothing pulls `pg` into
// client bundles. Keeps the union from drifting from the Postgres enum.
export type ActivityTypes = (typeof ActivityType.enumValues)[number]

/** Runtime-safe list mirroring {@link ActivityTypes}, for validation schemas. */
export const ACTIVITY_TYPES = [
  "run",
  "walk",
  "ride",
  "hike",
  "swim",
] as const satisfies readonly ActivityTypes[]
