declare const process: { env: Record<string, string | undefined> }

const DEFAULT_TILE_SERVER_URL = "http://localhost:4000"

/**
 * Base URL of the tile-provider service. `localhost` works only on the same machine;
 * a phone needs NEXT_PUBLIC_TILE_SERVER_URL (web) or EXPO_PUBLIC_TILE_SERVER_URL (mobile).
 * Next and Expo inline only names spelled out in full.
 */
function readTileServerUrl(): string {
  if (typeof process === "undefined") return DEFAULT_TILE_SERVER_URL
  return (
    process.env.NEXT_PUBLIC_TILE_SERVER_URL ??
    process.env.EXPO_PUBLIC_TILE_SERVER_URL ??
    DEFAULT_TILE_SERVER_URL
  )
}

export const TILE_SERVER_URL = readTileServerUrl().replace(/\/+$/, "")

/** MBTiles ships no fonts, so text layers need a glyph server. */
export const TILE_GLYPHS_URL = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
