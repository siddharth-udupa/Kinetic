import express from "express"
import { errorHandler } from "./error-handler.js"
import { health } from "./health.js"
import { loop } from "./loop.js"
import { requestIdMiddleware } from "./request-id.js"

export function buildServer() {
  const app = express()

  app.disable("x-powered-by")

  // Set the id before body parsing, so a malformed body still has one.
  app.use(requestIdMiddleware)
  app.use(express.json({ limit: "256kb" }))

  app.get("/health", health)
  app.post("/loop", loop)

  app.use((_request, response) => {
    response.status(404).json({ error: "Not found" })
  })

  app.use(errorHandler)

  return app
}
