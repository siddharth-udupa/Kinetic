export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function errorMessageOf(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined
  return typeof body.error === "string" ? body.error : undefined
}
