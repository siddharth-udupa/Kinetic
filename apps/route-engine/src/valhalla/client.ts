import { randomUUID } from "node:crypto"
import { env } from "../env.js"
import { ValhallaError } from "./errors.js"
import { errorMessageOf, isRecord } from "./guards.js"
import type { CallOptions } from "./types.js"

const DEFAULT_TIMEOUT_MS = 2_000

function transportError(
  error: unknown,
  requestId: string,
  timeoutMs: number
): ValhallaError {
  const timedOut =
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")

  return new ValhallaError(
    timedOut
      ? `Valhalla did not answer within ${timeoutMs} ms`
      : `Valhalla is unreachable at ${env.valhallaUrl}`,
    {
      code: timedOut ? "timeout" : "unreachable",
      requestId,
      cause: error,
    }
  )
}

export async function requestJson<T>(
  path: string,
  init: RequestInit,
  options: CallOptions
): Promise<{ data: T; requestId: string; durationMs: number }> {
  const requestId = options.requestId ?? randomUUID()
  const requestedTimeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  // Node's AbortSignal.timeout rejects fractional delays. The loop budget is
  // measured in floating-point milliseconds, so round down here, once.
  const timeoutMs = Number.isFinite(requestedTimeoutMs)
    ? Math.max(1, Math.floor(requestedTimeoutMs))
    : DEFAULT_TIMEOUT_MS
  const startedAt = performance.now()

  let response: Response
  try {
    response = await fetch(`${env.valhallaUrl}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        "x-request-id": requestId,
        ...init.headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    console.error(
      `[valhalla] ${requestId} request failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    throw transportError(error, requestId, timeoutMs)
  }

  let text: string
  try {
    text = await response.text()
  } catch (error) {
    throw transportError(error, requestId, timeoutMs)
  }

  const durationMs = performance.now() - startedAt
  const method = init.method ?? "GET"
  console.log(
    `[valhalla] ${requestId} ${method} ${path} ${response.status} ${durationMs.toFixed(0)}ms`
  )

  let body: unknown = null
  if (text.length > 0) {
    try {
      body = JSON.parse(text)
    } catch (error) {
      throw new ValhallaError(
        `Valhalla returned a non-JSON response (HTTP ${response.status})`,
        {
          code: "invalid_response",
          requestId,
          statusCode: response.status,
          cause: error,
        }
      )
    }
  }

  if (!response.ok) {
    throw new ValhallaError(
      errorMessageOf(body) ?? `Valhalla returned HTTP ${response.status}`,
      {
        code: "http",
        requestId,
        statusCode: response.status,
        body,
      }
    )
  }

  if (!isRecord(body)) {
    throw new ValhallaError("Valhalla returned an empty response", {
      code: "invalid_response",
      requestId,
      statusCode: response.status,
      body,
    })
  }

  return { data: body as T, requestId, durationMs }
}
