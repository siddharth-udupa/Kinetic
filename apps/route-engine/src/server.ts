import { randomUUID } from "node:crypto"
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express"
import { ValhallaError, getStatus } from "./valhalla.js"

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

export function buildServer() {
  const app = express()

  app.disable("x-powered-by")

  // Set the id before body parsing, so a malformed body still has one.
  app.use((request, response, next) => {
    const incoming = request.get("x-request-id")
    const requestId =
      incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID()

    response.locals.requestId = requestId
    response.setHeader("x-request-id", requestId)
    next()
  })

  app.use(express.json({ limit: "256kb" }))

  app.get("/health", async (_request, response) => {
    const requestId = response.locals.requestId as string

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
  })

  app.use((_request, response) => {
    response.status(404).json({ error: "Not found" })
  })

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction
    ) => {
      if (response.headersSent) return

      if (error instanceof ValhallaError) {
        console.error(
          `[route-engine] ${error.requestId} ${error.code}: ${error.message}`
        )
        response.status(502).json({
          error: error.message,
          code: error.code,
          requestId: error.requestId,
        })
        return
      }

      if (error instanceof SyntaxError) {
        response.status(400).json({ error: "Invalid JSON body" })
        return
      }

      console.error(error)
      response.status(500).json({ error: "Internal server error" })
    }
  )

  return app
}
