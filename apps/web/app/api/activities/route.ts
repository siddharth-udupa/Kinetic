import {
  CreateActivity,
  getActivitiesByUser,
  type activitiesInsertType,
} from "@repo/db"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ZodError } from "@repo/validation"
import { headers } from "next/headers"
import {
  normalizeMobileActivity,
  normalizeGpxActivity,
  normalizeManualActivity,
  NormalizationError,
  type NormalizedActivityData,
} from "@/lib/normalization"

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = req.nextUrl
    const userId: string | null = searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const page = Number(searchParams.get("page") ?? 0)
    const limit = Number(searchParams.get("limit") ?? 5)
    const offset = page * limit
    const data = await getActivitiesByUser(userId, limit, offset)
    return NextResponse.json(data)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

/** Sources the client may post an activity from. */
const ACTIVITY_SOURCES = ["mobile", "gpx", "manual"] as const
type ActivitySource = (typeof ACTIVITY_SOURCES)[number]

function isActivitySource(value: unknown): value is ActivitySource {
  return (
    typeof value === "string" &&
    (ACTIVITY_SOURCES as readonly string[]).includes(value)
  )
}

/** Maps a normalized activity onto the drizzle insert payload. `null` becomes
 *  `undefined` so drizzle omits the column instead of writing NULL. */
function toInsertPayload(
  userId: string,
  normalized: NormalizedActivityData
): activitiesInsertType {
  return {
    userId,
    type: normalized.type,
    title: normalized.title,
    description: normalized.description ?? undefined,
    location: normalized.location ?? undefined,
    distance: normalized.distance,
    duration: normalized.duration,
    elevationGain: normalized.elevationGain,
    elevationLoss: normalized.elevationLoss,
    encodedPolyline: normalized.encodedPolyline ?? undefined,
    maxSpeedMps: normalized.maxSpeedMps ?? undefined,
    startTime: normalized.startTime ?? undefined,
    endTime: normalized.endTime ?? undefined,
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // GPX posts carry a 10 MB XML string, so cap the body before reading it.
    const contentLength = Number(req.headers.get("content-length") ?? 0)
    if (Number.isFinite(contentLength) && contentLength > 12_000_000) {
      return NextResponse.json(
        { error: "Request body is too large (max 12 MB)" },
        { status: 413 }
      )
    }

    const userId = session.user.id

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 }
      )
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 }
      )
    }

    const { source, data } = body as { source?: unknown; data?: unknown }

    if (!isActivitySource(source)) {
      return NextResponse.json(
        {
          error: `Unsupported activity source. Expected one of: ${ACTIVITY_SOURCES.join(", ")}`,
        },
        { status: 400 }
      )
    }

    if (data === undefined || data === null) {
      return NextResponse.json(
        { error: "Missing required field: 'data'" },
        { status: 400 }
      )
    }

    // Both error types are bad client input (400). Anything else is a server
    // bug and falls through to the 500.
    let normalized: NormalizedActivityData
    try {
      switch (source) {
        case "mobile":
          normalized = normalizeMobileActivity(data)
          break
        case "gpx":
          normalized = normalizeGpxActivity(data)
          break
        case "manual":
          normalized = normalizeManualActivity(data)
          break
      }
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", detailedError: err.issues },
          { status: 400 }
        )
      }

      if (err instanceof NormalizationError) {
        return NextResponse.json(
          { error: err.message },
          { status: 400 }
        )
      }

      throw err
    }

    // One transaction: a failed streams insert must not leave the activity row.
    const created = await CreateActivity(
      toInsertPayload(userId, normalized),
      normalized.streams ?? undefined
    )

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (err) {
    console.error("POST /api/activities failed:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
