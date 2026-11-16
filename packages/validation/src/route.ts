import { z } from "zod"

/** The two profiles the v1 loop engine supports. */
export const RouteProfileSchema = z.enum(["bike", "foot"])
export type RouteProfile = z.infer<typeof RouteProfileSchema>

export const LoopRequestSchema = z.object({
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  /** Target loop length, clamped by the engine to 1–80 km. */
  distanceMeters: z.number().int().min(1_000).max(80_000),
  profile: RouteProfileSchema,
  /** 32-bit seed. Omit it and the engine picks one and echoes it back. */
  seed: z.number().int().min(0).max(4_294_967_295).optional(),
})
export type LoopRequest = z.infer<typeof LoopRequestSchema>

export const LoopRouteSchema = z.object({
  /** 1 is the best route in the response. */
  rank: z.number().int().min(1).max(3),
  distanceMeters: z.number(),
  durationSeconds: z.number(),
  elevationGainMeters: z.number(),
  /** |actual − requested| / requested. 0 is perfect. */
  accuracy: z.number(),
  /** Polsby-Popper compactness: 1 is a circle, 0 is an out-and-back. */
  loopiness: z.number(),
  /** Share of the route that retraces a road it already used. */
  repeatedRoadPercent: z.number().min(0).max(100),
  repeatedRoadMeters: z.number(),
  /** Two-dimensional crossings of the route with itself. */
  selfIntersections: z.number().int(),
  /** Reversals and very sharp corners, not ordinary road curvature. */
  sharpTurns: z.number().int(),
  uTurns: z.number().int(),
  /** Lower is better; the engine ranks on this. */
  score: z.number(),
  /** Google polyline at 1e-5 precision, ready for the map components. */
  polyline: z.string(),
})
export type LoopRoute = z.infer<typeof LoopRouteSchema>

export const LoopResponseSchema = z.object({
  seed: z.number().int(),
  profile: RouteProfileSchema,
  requestedDistanceMeters: z.number(),
  /**
   * The best route is mirrored at the top level for clients that render a
   * single loop. New clients should read `routes` and show the ranked list.
   */
  distanceMeters: z.number(),
  durationSeconds: z.number(),
  elevationGainMeters: z.number(),
  accuracy: z.number(),
  loopiness: z.number(),
  polyline: z.string(),
  /** Up to three clean, distinct loops, best first. */
  routes: z.array(LoopRouteSchema).min(1).max(3),
  warnings: z.array(z.string()),
})
export type LoopResponse = z.infer<typeof LoopResponseSchema>
