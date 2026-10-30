export type ValhallaErrorCode =
  | "timeout"
  | "unreachable"
  | "http"
  | "invalid_response"

export class ValhallaError extends Error {
  readonly code: ValhallaErrorCode
  readonly requestId: string
  readonly statusCode?: number
  readonly body?: unknown

  constructor(
    message: string,
    options: {
      code: ValhallaErrorCode
      requestId: string
      statusCode?: number
      body?: unknown
      cause?: unknown
    }
  ) {
    super(message, { cause: options.cause })
    this.name = "ValhallaError"
    this.code = options.code
    this.requestId = options.requestId
    this.statusCode = options.statusCode
    this.body = options.body
  }
}
