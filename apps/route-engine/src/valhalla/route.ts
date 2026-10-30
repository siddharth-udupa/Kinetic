import { requestJson } from "./client.js"
import { ValhallaError } from "./errors.js"
import { errorMessageOf, isRecord } from "./guards.js"
import type {
  CallOptions,
  RouteResult,
  ValhallaRouteRequest,
  ValhallaRouteResponse,
} from "./types.js"

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
