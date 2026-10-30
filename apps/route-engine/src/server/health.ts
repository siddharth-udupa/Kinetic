import type { Request, Response } from "express"
import { getStatus, ValhallaError } from "../valhalla/index.js"
import { requestIdOf } from "./request-id.js"

export async function health(
  _request: Request,
  response: Response
): Promise<void> {
  const requestId = requestIdOf(response)

  try {
    const { status, durationMs } = await getStatus({ requestId })

    response.json({
      status: "ok",
      service: "route-engine",
      valhalla: {
        reachable: true,
        version: status.version,
        tilesetLastModified: status.tileset_last_modified ?? null,
        latencyMs: Math.round(durationMs),
      },
    })
  } catch (error) {
    response.status(503).json({
      status: "degraded",
      service: "route-engine",
      valhalla: {
        reachable: false,
        code: error instanceof ValhallaError ? error.code : "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}
