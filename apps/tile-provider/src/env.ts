import path from "node:path"
import { config } from "dotenv"

config({ path: ".env", quiet: true })

function num(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  host: process.env.HOST ?? "0.0.0.0",
  port: num(process.env.PORT, 4000),
  /** The read-only .mbtiles file to serve. */
  dbPath: process.env.TILES_DB_PATH ?? path.resolve("data/south-india.mbtiles"),
}
