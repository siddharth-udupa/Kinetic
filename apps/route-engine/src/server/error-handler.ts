import type { NextFunction, Request, Response } from "express"
import { ZodError } from "@repo/validation"
import { LoopError } from "../loop/index.js"
import { ValhallaError } from "../valhalla/index.js"
import { requestIdOf } from "./request-id.js"

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): void {
  if (response.headersSent) return

  if (error instanceof ZodError) {
    response.status(400).json({
      error: "Invalid loop request",
      issues: error.issues,
    })
    return
  }

  if (error instanceof LoopError) {
    const requestId = requestIdOf(response)
    console.error(
      `[route-engine] ${requestId} ${error.code}: ${error.message}`
    )
    response.status(422).json({
      error: error.message,
      code: error.code,
      requestId,
    })
    return
  }

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
