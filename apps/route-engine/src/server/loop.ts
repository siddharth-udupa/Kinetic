import type { Request, Response } from "express"
import { LoopRequestSchema } from "@repo/validation"
import {
  generateLoop,
  type LoopDiagnostics,
} from "../loop/index.js"
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

  let diagnostics: LoopDiagnostics | undefined
  const result = await generateLoop(parsed.data, {
    requestId,
    onDiagnostics: (stats) => {
      diagnostics = stats
    },
  })

  const best = result.routes[0]

  // One line per request: enough to tell whether a generation failed because
  // of distance, overlap or the shape, without dumping the payload.
  console.log(
    `[loop] ${requestId} ${result.profile} ${best.distanceMeters}m ` +
      `(target ${result.requestedDistanceMeters}m, accuracy ${(
        best.accuracy * 100
      ).toFixed(1)}%, ${result.routes.length} route(s), ` +
      `${diagnostics?.routedCount ?? 0} routed from ${
        diagnostics?.candidateCount ?? 0
      } seeds, ${diagnostics?.refinedCount ?? 0} refined, ` +
      `overlap ${best.repeatedRoadPercent.toFixed(1)}%, ` +
      `crossings ${best.selfIntersections}, ` +
      `${result.warnings.length} warning(s))`
  )

  response.json(result)
}
