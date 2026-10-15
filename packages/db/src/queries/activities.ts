import { and, desc, eq } from "drizzle-orm"
import { db } from "../db"
import {
  activities,
  activitiesInsertType,
  activityStreams,
  activityStreamsInsertType,
  user,
} from "../schema"

export type ActivityDetailsType = NonNullable<Awaited<ReturnType<typeof getActivityDetails>>>

export async function getActivitiesByUser(userId: string, limit = 5, offset = 0) {
  const UserActivities = await db
    .select({
      userName: user.name,
      activityId: activities.activityId,
      userId: activities.userId,
      type: activities.type,
      title: activities.title,
      description: activities.description,
      location: activities.location,
      distance: activities.distance,
      duration: activities.duration,
      encodedPolyline: activities.encodedPolyline,
      maxSpeedMps: activities.maxSpeedMps,
      elevationGain: activities.elevationGain,
      elevationLoss: activities.elevationLoss,
      startTime: activities.startTime,
      endTime: activities.endTime,
      createdAt: activities.createdAt,
    })
    .from(user)
    .innerJoin(activities, eq(activities.userId, user.id))
    .where(eq(activities.userId, userId))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(activities.createdAt))

  return UserActivities
}

export async function getActivityDetails(activityId: string) {
  const activity = await db.query.activities.findFirst({
    where: eq(activities.activityId, activityId),
    with: {
      streams: true,
      user: {
        with: {
          preferences: true,
        },
      },
    },
  })

  return activity
}

export type ActivityStreamsInput = Omit<
  activityStreamsInsertType,
  "id" | "activityId" | "createdAt"
>

/**
 * Inserts an activity and its streams atomically: a failed streams insert rolls back
 * the activity instead of leaving it with no track data.
 */
export async function CreateActivity(
  data: activitiesInsertType,
  streams?: ActivityStreamsInput
) {
  const [created] = await db.transaction(async (tx) => {
    const inserted = await tx.insert(activities).values(data).returning()

    if (streams) {
      await tx.insert(activityStreams).values({
        activityId: inserted[0].activityId,
        timeData: streams.timeData,
        distanceData: streams.distanceData,
        altitudeData: streams.altitudeData,
        speedData: streams.speedData,
      })
    }

    return inserted
  })

  return created
}

export async function DeleteActivity(activityId: string, userId?: string) {
  const whereClause = userId
    ? and(eq(activities.activityId, activityId), eq(activities.userId, userId))
    : eq(activities.activityId, activityId)

  const [res] = await db
    .delete(activities)
    .where(whereClause)
    .returning({ id: activities.activityId })

  return res ?? null
}