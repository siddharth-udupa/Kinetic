import { config } from "dotenv"

config({ path: ".env", quiet: true })

function num(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function url(value: string | undefined, fallback: string) {
  return (value ?? fallback).replace(/\/+$/, "")
}

const fallbackUrl = process.env.VALHALLA_FALLBACK_URL?.trim()

export const env = {
  host: process.env.HOST ?? "127.0.0.1",
  port: num(process.env.PORT, 8003),
  /** No trailing slash, so callers can append `/route` directly. */
  valhallaUrl: url(process.env.VALHALLA_URL, "http://localhost:8002"),
  /**
   * Optional development fallback used when `valhallaUrl` is unreachable.
   * Leave unset when coordinates must not leave the machine.
   */
  valhallaFallbackUrl: fallbackUrl ? url(fallbackUrl, "") : undefined,
}
