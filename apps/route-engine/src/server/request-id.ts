import { randomUUID } from "node:crypto"
import type { NextFunction, Request, Response } from "express"

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  const incoming = request.get("x-request-id")
  const requestId =
    incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID()

  response.locals.requestId = requestId
  response.setHeader("x-request-id", requestId)
  next()
}

export function requestIdOf(response: Response): string {
  return response.locals.requestId as string
}
