import type { Request, Response } from "express"
import { LoopRequestSchema } from "@repo/validation"
import { generateLoop } from "../loop/index.js"
import { requestIdOf } from "./request-id.js"

export async function loop(
  request: Request,
  response: Response
): Promise<void> {
  const requestId = requestIdOf(response)
  const parsed = LoopRequestSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(400).json({
      error: "Invalid loop request",
      issues: parsed.error.issues,
    })
    return
  }

  const result = await generateLoop(parsed.data, { requestId })

  // The engine logs a one-line summary and leaves the response to clients to
  // render. Keeping the payload out of this log makes `pnpm engine` readable
  // while the endpoint is being exercised by hand.
  console.log(
    `[loop] ${requestId} ${result.profile} ${result.distanceMeters}m ` +
      `(target ${result.requestedDistanceMeters}m, accuracy ${(
        result.accuracy * 100
      ).toFixed(1)}%, ${result.warnings.length} warning(s))`
  )

  response.json(result)
}
