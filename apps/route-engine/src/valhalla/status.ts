import { requestJson } from "./client.js"
import { ValhallaError } from "./errors.js"
import type { CallOptions, StatusResult, ValhallaStatus } from "./types.js"

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
