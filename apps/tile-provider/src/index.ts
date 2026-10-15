import {
  getMbtilesMetadata,
  openMbtiles,
  type MbtilesDb,
  type MbtilesMetadata,
} from "@repo/tiles"
import { existsSync } from "node:fs"
import { env } from "./env.js"
import { buildServer } from "./server.js"

/** Opens the tileset before the server starts, so a bad path fails boot with an
 * explanation instead of serving 404s. */
async function openTileset(file: string): Promise<{
  db: MbtilesDb
  metadata: MbtilesMetadata
}> {
  if (!existsSync(file)) {
    console.error(
      `No tileset at ${file}\n` +
        `Point TILES_DB_PATH at an .mbtiles file (see .env.example).`
    )
    process.exit(1)
  }

  try {
    const db = openMbtiles(file)
    return { db, metadata: await getMbtilesMetadata(db) }
  } catch (error) {
    console.error(
      `Could not read ${file} as an MBTiles file: ${
        error instanceof Error ? error.message : error
      }`
    )
    process.exit(1)
  }
}

const { db, metadata } = await openTileset(env.dbPath)

const app = buildServer({ db })

console.log(
  `Serving ${metadata.name ?? "tileset"} (${metadata.format ?? "unknown format"}) ` +
    `zoom ${metadata.minzoom}-${metadata.maxzoom} from ${env.dbPath}`
)

app.server.on("error", (error) => {
  console.error(`Tile server could not start: ${error.message}`)
  process.exit(1)
})

app.listen(env.port, env.host, () => {
  console.log(`Tile server listening on http://${env.host}:${env.port}`)
})
