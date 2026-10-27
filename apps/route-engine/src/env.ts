import { config } from "dotenv"

config({ path: ".env", quiet: true })

function num(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  host: process.env.HOST ?? "127.0.0.1",
  port: num(process.env.PORT, 8003),
  /** No trailing slash, so callers can append `/route` directly. */
  valhallaUrl: (process.env.VALHALLA_URL ?? "http://localhost:8002").replace(
    /\/+$/,
    ""
  ),
}
