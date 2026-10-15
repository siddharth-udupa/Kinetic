import { z } from "zod"
import { ACTIVITY_TYPES } from "@repo/types"

/**
 * The activity type field, checked once at the edge. The `activity_type` pgEnum takes
 * lowercase only, so values are lowercased here instead of failing on INSERT.
 */
export const ActivityTypeSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z.enum(ACTIVITY_TYPES, {
      error: `Must be one of: ${ACTIVITY_TYPES.join(", ")}`,
    })
  )

/** @deprecated use {@link ActivityTypeSchema} */
export const ActivityTypesSchema = ActivityTypeSchema

// Shared field schemas
const MAX_TRACK_POINTS = 100_000
const MAX_TITLE_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_GPX_BYTES = 10_000_000

const TitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(MAX_TITLE_LENGTH)

const DescriptionSchema = z
  .string()
  .trim()
  .max(MAX_DESCRIPTION_LENGTH)
  .nullable()
  .optional()

/**
 * A date-time string `new Date()` can parse, left a `string` for client form input
 * types. Rejects bad values here rather than producing `Invalid Date` and crashing the INSERT.
 */
const DateStringSchema = z
  .string()
  .trim()
  .min(1, "Invalid date")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Invalid date",
  })

const DurationObjectSchema = z.object({
  hr: z.number().int().min(0),
  min: z.number().int().min(0).max(59),
  sec: z.number().int().min(0).max(59),
})

// Mobile recorder payload
export const MobileActivityPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().nullable().optional(),
  speed: z.number().nonnegative().nullable().optional(),
  accuracy: z.number().nonnegative().nullable().optional(),
  timestamp: z.number().int().nonnegative(),
})

export const MobileActivitySchema = z
  .object({
    id: z.string().optional(),
    type: ActivityTypeSchema,
    title: TitleSchema,
    description: DescriptionSchema,
    startedAt: z.number().int().nonnegative(),
    endedAt: z.number().int().nonnegative().optional(),
    distanceMeters: z.number().nonnegative(),
    durationSeconds: z.number().nonnegative(),
    movingTimeSeconds: z.number().nonnegative().optional(),
    avgSpeedMps: z.number().nonnegative().optional(),
    maxSpeedMps: z.number().nonnegative().optional(),
    points: z
      .array(MobileActivityPointSchema)
      .max(MAX_TRACK_POINTS, `Too many track points (max ${MAX_TRACK_POINTS})`)
      .optional()
      .default([]),
  })
  .refine((value) => value.endedAt === undefined || value.endedAt >= value.startedAt, {
    message: "End time must be after start time",
    path: ["endedAt"],
  })

// GPX upload payload
export const GpxActivitySchema = z.object({
  title: TitleSchema,
  description: DescriptionSchema,
  xmlContent: z
    .string()
    .min(1, "GPX content cannot be empty")
    .max(MAX_GPX_BYTES, "GPX file is too large (max 10 MB)"),
  type: ActivityTypeSchema.default("run"),
})

// Manually entered activity
export const MetaDataSchema = z.object({
  distanceUnit: z.enum(["metric", "imperial"]),
  elevUnitGain: z.enum(["meters", "feet"]),
  elevUnitLoss: z.enum(["meters", "feet"]),
})

export const ManualActivitySchema = z
  .object({
    title: TitleSchema,
    description: DescriptionSchema,
    type: ActivityTypeSchema,
    distance: z.number().nonnegative(),
    duration: z.union([z.number().nonnegative(), DurationObjectSchema]),
    elevationGain: z.number().nonnegative().optional().default(0),
    elevationLoss: z.number().nonnegative().optional().default(0),
    startTime: DateStringSchema.nullable().optional(),
    endTime: DateStringSchema.nullable().optional(),
    metaData: z
      .object({
        distanceUnit: z.enum(["metric", "imperial"]).optional().default("metric"),
        elevUnitGain: z.enum(["meters", "feet"]).optional().default("meters"),
        elevUnitLoss: z.enum(["meters", "feet"]).optional().default("meters"),
      })
      .optional()
      .default({
        distanceUnit: "metric",
        elevUnitGain: "meters",
        elevUnitLoss: "meters",
      }),
  })
  .refine(
    (value) =>
      !value.startTime ||
      !value.endTime ||
      new Date(value.endTime).getTime() >= new Date(value.startTime).getTime(),
    { message: "End time must be after start time", path: ["endTime"] }
  )

// Legacy shapes
export const CreateActivitySchema = z.object({
  distance: z.number().nonnegative(),
  duration: DurationObjectSchema,
  elevationGain: z.number().nonnegative(),
  elevationLoss: z.number().nonnegative(),
  type: ActivityTypeSchema,
  startTime: z.iso.datetime({ local: true }),
  endTime: z.iso.datetime({ local: true }),
  title: TitleSchema,
  description: z.string().max(MAX_DESCRIPTION_LENGTH),
})

export const UploadFileSchema = z.object({
  title: TitleSchema,
  description: z.string().max(MAX_DESCRIPTION_LENGTH).nullable(),
  file: z.file(),
})

export type CreateActivityCardType = z.infer<typeof CreateActivitySchema>
export type MetaDataType = z.infer<typeof MetaDataSchema>
export type MobileActivityPointInput = z.infer<typeof MobileActivityPointSchema>
export type MobileActivityInput = z.infer<typeof MobileActivitySchema>
export type GpxActivityInput = z.infer<typeof GpxActivitySchema>
export type ManualActivityInput = z.infer<typeof ManualActivitySchema>
