import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

/**
 * The MBTiles 1.3 tables as a tiling pipeline writes them, read-only: it only
 * names and types the columns.
 */
export const tiles = sqliteTable("tiles", {
  zoomLevel: integer("zoom_level").notNull(),
  tileColumn: integer("tile_column").notNull(),
  /** Stored in TMS, i.e. the XYZ row flipped — see {@link toStorageRow}. */
  tileRow: integer("tile_row").notNull(),
  tileData: blob("tile_data", { mode: "buffer" }).notNull(),
})

export type tilesType = typeof tiles.$inferSelect

export const metadata = sqliteTable("metadata", {
  name: text("name").notNull(),
  value: text("value").notNull(),
})

export type metadataType = typeof metadata.$inferSelect
