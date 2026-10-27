import { randomUUID } from "node:crypto"
import { env } from "./env.js"

const DEFAULT_TIMEOUT_MS = 2_000

export type Costing = "bicycle" | "pedestrian"

export type ValhallaLocationType = "break" | "through" | "via" | "break_through"

export type ValhallaLocation = {
  lat: number
  lon: number
  type?: ValhallaLocationType
  /** Snap search radius in metres. */
  radius?: number
  heading?: number
  heading_tolerance?: number
  minimum_reachability?: number
}

export type CostingOptions = {
  bicycle?: {
    /** 0 = prefer flat, 1 = prefer hills. Valhalla's default is 0.25. */
    use_hills?: number
    bicycle_type?: "Road" | "Hybrid" | "Cross" | "Mountain"
    avoid_bad_surfaces?: number
    use_roads?: number
    use_lit?: number
  }
  pedestrian?: {
    use_hills?: number
    walkway_factor?: number
    sidewalk_factor?: number
    use_ferry?: number
  }
}

export type ValhallaRouteRequest = {
  locations: ValhallaLocation[]
  costing: Costing
  units?: "kilometers" | "miles"
  directions_type?: "none" | "maneuvers" | "instructions"
  /** Return elevation samples at this interval, in metres. */
  elevation_interval?: number
  costing_options?: CostingOptions
  language?: string
}

export type ValhallaLeg = {
  shape: string
  elevation?: number[]
  summary?: {
    length: number
    time: number
  }
  maneuvers?: unknown[]
}

export type ValhallaRouteResponse = {
  trip: {
    summary: {
      length: number
      time: number
      cost?: number
      has_toll?: boolean
      has_highway?: boolean
      has_ferry?: boolean
      has_time_restrictions?: boolean
    }
    legs: ValhallaLeg[]
    locations?: Array<{
      type: string
      lat: number
      lon: number
      original_index?: number
    }>
    units?: string
    language?: string
  }
}

export type ValhallaStatus = {
  version: string
  tileset_last_modified?: number
  available_actions?: string[]
}

export type ValhallaErrorCode =
  | "timeout"
  | "unreachable"
  | "http"
  | "invalid_response"

export class ValhallaError extends Error {
  readonly code: ValhallaErrorCode
  readonly requestId: string
  readonly statusCode?: number
  readonly body?: unknown

  constructor(
    message: string,
    options: {
      code: ValhallaErrorCode
      requestId: string
      statusCode?: number
      body?: unknown
      cause?: unknown
    }
  ) {
    super(message, { cause: options.cause })
    this.name = "ValhallaError"
    this.code = options.code
    this.requestId = options.requestId
    this.statusCode = options.statusCode
    this.body = options.body
  }
}

export type CallOptions = {
  /** Correlates the engine log line with the Valhalla call. */
  requestId?: string
  timeoutMs?: number
}

export type RouteResult = {
  trip: ValhallaRouteResponse["trip"]
  requestId: string
  durationMs: number
}

export type StatusResult = {
  status: ValhallaStatus
  requestId: string
  durationMs: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function errorMessageOf(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined
  return typeof body.error === "string" ? body.error : undefined
}

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

async function requestJson<T>(
  path: string,
  init: RequestInit,
  options: CallOptions
): Promise<{ data: T; requestId: string; durationMs: number }> {
  const requestId = options.requestId ?? randomUUID()
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
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

/**
 * Calls Valhalla's `/route` endpoint. One call returns one leg, even when there
 * are `through` locations in the middle, which is what the loop generator will
 * use to shape a route.
 */
export async function route(
  request: ValhallaRouteRequest,
  options: CallOptions = {}
): Promise<RouteResult> {
  const { data, requestId, durationMs } = await requestJson<ValhallaRouteResponse>(
    "/route",
    { method: "POST", body: JSON.stringify(request) },
    options
  )

  if (
    !isRecord(data.trip) ||
    !Array.isArray(data.trip.legs) ||
    data.trip.legs.length === 0
  ) {
    throw new ValhallaError(
      errorMessageOf(data) ?? "Valhalla returned a route without a trip",
      {
        code: "invalid_response",
        requestId,
      }
    )
  }

  return { trip: data.trip, requestId, durationMs }
}

/** Proxies Valhalla's `/status`, used by the engine's health check. */
export async function getStatus(
  options: CallOptions = {}
): Promise<StatusResult> {
  const { data, requestId, durationMs } = await requestJson<ValhallaStatus>(
    "/status",
    { method: "GET" },
    { ...options, timeoutMs: options.timeoutMs ?? 1_500 }
  )

  if (typeof data.version !== "string") {
    throw new ValhallaError("Valhalla status is missing its version", {
      code: "invalid_response",
      requestId,
    })
  }

  return { status: data, requestId, durationMs }
}
