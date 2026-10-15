import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema.js"

/**
 * Opens an existing `.mbtiles` for reading, never creating or migrating it.
 * `fileMustExist` turns a wrong path into a boot error instead of a server that 404s
 * every tile.
 */
export function openMbtiles(file: string) {
  const sqlite = new Database(file, { readonly: true, fileMustExist: true })

  return drizzle(sqlite, { schema })
}

export type MbtilesDb = ReturnType<typeof openMbtiles>
