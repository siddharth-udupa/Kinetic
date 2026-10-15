import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getUserByUsername, updateUserUsername } from "@repo/db"

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { username } = body ?? {}

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Missing or invalid username" }, { status: 400 })
    }

    const trimmed = username.trim().toLowerCase()

    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters: letters, numbers, and underscores only." },
        { status: 422 }
      )
    }

    const existing = await getUserByUsername(trimmed)
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 })
    }

    const updated = await updateUserUsername(session.user.id, trimmed)
    return NextResponse.json({ user: updated })
  } catch (err) {
    console.error("[PATCH /api/user]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
