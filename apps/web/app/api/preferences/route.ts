import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { createUserPreferences, getUserPreferences, updateUserPreference } from "@repo/db"

export async function GET(_req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Idempotent: creates the row when it is missing.
    const prefs = await createUserPreferences(session.user.id)
    return NextResponse.json(prefs)
  } catch (err) {
    console.error("[GET /api/preferences]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()

    // Merge so only the provided fields change.
    const current = await getUserPreferences(session.user.id)
    if (!current) {
      return NextResponse.json({ error: "Preferences not found" }, { status: 404 })
    }

    const updated = await updateUserPreference(session.user.id, {
      ...current,
      ...body,
      userId: session.user.id,   // the client cannot change the owner
      updatedAt: new Date(),
    })

    return NextResponse.json(updated[0] ?? updated)
  } catch (err) {
    console.error("[PATCH /api/preferences]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
