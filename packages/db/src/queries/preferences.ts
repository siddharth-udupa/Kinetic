import { eq } from "drizzle-orm"
import { db } from "../db"
import { preferencesType, userPreferences } from "../schema"


export async function createUserPreferences(userId: string) {
  const [inserted] = await db 
    .insert(userPreferences)
    .values({
      userId: userId,
    })
    .onConflictDoNothing({ target: userPreferences.userId })
    .returning()

  if (inserted) return inserted

  const [existing] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))

  return existing
}


export async function getUserPreferences(userId: string) {
  const [preferences] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))

  return preferences
}


export async function updateUserPreference(userId: string, data: preferencesType) {
  const preferences = await db
    .update(userPreferences)
    .set(data)
    .where(eq(userPreferences.userId,userId))
    .returning()

  return preferences
}