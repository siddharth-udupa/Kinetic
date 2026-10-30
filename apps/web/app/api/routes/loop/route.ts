import { LoopRequestSchema, LoopResponseSchema } from "@repo/validation"
import { headers } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const ROUTE_ENGINE_URL = (
  process.env.ROUTE_ENGINE_URL ?? "http://localhost:8003"
).replace(/\/+$/, "")

// The engine spends at most 2.5 s on a loop. Give the hop a little headroom so
// its own 422/502 still reaches the client instead of becoming a 504 here.
const ENGINE_TIMEOUT_MS = 3_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function errorOf(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined
  return typeof payload.error === "string" ? payload.error : undefined
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    )
  }

  const parsedRequest = LoopRequestSchema.safeParse(body)
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid loop request", issues: parsedRequest.error.issues },
      { status: 400 }
    )
  }

  const requestId = crypto.randomUUID()

  let engineResponse: Response
  try {
    engineResponse = await fetch(`${ROUTE_ENGINE_URL}/loop`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId,
      },
      body: JSON.stringify(parsedRequest.data),
      signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS),
      cache: "no-store",
    })
  } catch (error) {
    const timedOut =
      error instanceof Error && error.name === "TimeoutError"

    console.error(
      `[POST /api/routes/loop] ${requestId} engine ${
        timedOut ? "timed out" : "unreachable"
      }`,
      error
    )

    return NextResponse.json(
      {
        error: timedOut
          ? "The route engine timed out"
          : "The route engine is unreachable",
        requestId,
      },
      { status: timedOut ? 504 : 502 }
    )
  }

  const text = await engineResponse.text()
  let payload: unknown = null

  if (text.length > 0) {
    try {
      payload = JSON.parse(text)
    } catch {
      console.error(
        `[POST /api/routes/loop] ${requestId} engine returned non-JSON (HTTP ${engineResponse.status})`
      )
      return NextResponse.json(
        { error: "The route engine returned an invalid response", requestId },
        { status: 502 }
      )
    }
  }

  if (!engineResponse.ok) {
    const message =
      errorOf(payload) ??
      `The route engine returned HTTP ${engineResponse.status}`

    console.error(
      `[POST /api/routes/loop] ${requestId} engine ${engineResponse.status}: ${message}`
    )

    return NextResponse.json(
      { error: message, requestId },
      {
        // A 400/422 is actionable for the client. The engine's 5xx is a bad
        // gateway from the browser's point of view.
        status: engineResponse.status >= 500 ? 502 : engineResponse.status,
      }
    )
  }

  const parsedResponse = LoopResponseSchema.safeParse(payload)
  if (!parsedResponse.success) {
    console.error(
      `[POST /api/routes/loop] ${requestId} invalid engine response`,
      parsedResponse.error.issues
    )
    return NextResponse.json(
      { error: "The route engine returned an invalid response", requestId },
      { status: 502 }
    )
  }

  return NextResponse.json(parsedResponse.data, {
    headers: { "x-request-id": requestId },
  })
}
