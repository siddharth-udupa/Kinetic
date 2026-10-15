import { relations } from "drizzle-orm"
import { pgTable, text, uuid, timestamp, integer, boolean, real, jsonb, pgEnum } from "drizzle-orm/pg-core"


export const ActivityType = pgEnum("activity_type", ["run", "walk", "ride", "hike", "swim"])

export const theme = pgEnum("theme", ["system", "dark", "light"])

export const distanceUnit = pgEnum("distance_unit", ["metric", "imperial"])

export const elevationUnit = pgEnum("elevation_unit", ["meters", "feet"])

export const paceUnit = pgEnum("pace_unit", ["min/km", "min/mi"])

export const speedUnit = pgEnum("speed_unit", ["km/h", "mph", "m/s"])

export const weightUnit = pgEnum("weight_unit", ["kg", "lb"])

export const timeFormat = pgEnum("time_format", ["12h", "24h"])


export const activities = pgTable("activities", {
  activityId: uuid("activity_id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: ActivityType("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  distance: integer("distance").notNull(),
  duration: integer("duration").notNull(),
  encodedPolyline: text("encoded_polyline"),
  maxSpeedMps: real("max_speed_mps"),
  elevationGain: integer("elevation_gain").notNull(),
  elevationLoss: integer("elevation_loss").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})


// Store as JSON arrays — efficient for bulk reads, no joins needed
export const activityStreams = pgTable("activity_streams", {
  id: uuid("id").defaultRandom().primaryKey(),
  activityId: uuid("activity_id").notNull().references(() => activities.activityId, { onDelete: "cascade" }),
  timeData: jsonb("time_data").notNull().$type<number[]>(),
  distanceData: jsonb("distance_data").notNull().$type<number[]>(),
  altitudeData: jsonb("altitude_data").notNull().$type<number[]>(),
  speedData: jsonb("speed_data").notNull().$type<number[]>(),
  createdAt: timestamp("created_at").defaultNow(),
})


export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  onBoarded: boolean("on_boarded").default(false),
  theme: theme("theme").default("system").notNull(),
  distanceUnit: distanceUnit("distance_unit").default("metric").notNull(),
  elevationUnit: elevationUnit("elevation_unit").default("meters").notNull(),
  paceUnit: paceUnit("pace_unit").default("min/km").notNull(),
  speedUnit: speedUnit("speed_unit").default("km/h").notNull(),
  weightUnit: weightUnit("weight_unit").default("kg").notNull(),
  timeFormat: timeFormat("time_format").default("24h").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
})

export type activitiesType = typeof activities.$inferSelect
export type activitiesInsertType = typeof activities.$inferInsert

export type activityStreamsType = typeof activityStreams.$inferSelect
export type activityStreamsInsertType = typeof activityStreams.$inferInsert


export type preferencesType = typeof userPreferences.$inferSelect
export type preferencesInsertType = typeof userPreferences.$inferInsert


export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),   // Hashed password lives here, not on the user table.
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
})


export const activitiesRelations = relations(activities, ({ one, many }) => ({
  streams: many(activityStreams),

  user: one(user, {
    fields: [activities.userId],
    references: [user.id],
  }),
}))

export const activityStreamsRelations = relations(activityStreams, ({ one }) => ({
  activity: one(activities, {
    fields: [activityStreams.activityId],
    references: [activities.activityId],
  }),
}))

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(user, {
    fields: [userPreferences.userId],
    references: [user.id],
  }),
}))

export const userRelations = relations(user, ({ many, one }) => ({
  activities: many(activities),
  preferences: one(userPreferences, {
    fields: [user.id],
    references: [userPreferences.userId],
  }),
}))