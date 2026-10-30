export type LoopErrorCode = "no_candidate"

/** A request the engine understood but could not satisfy with the graph. */
export class LoopError extends Error {
  readonly code: LoopErrorCode

  constructor(message: string, code: LoopErrorCode = "no_candidate") {
    super(message)
    this.name = "LoopError"
    this.code = code
  }
}
