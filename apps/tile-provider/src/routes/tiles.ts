import {
  getTile,
  TileCoordSchema,
  tileKey,
  type MbtilesDb,
  type TileCoord,
} from "@repo/tiles"
import type { Cpeak, CpeakRequest, Handler } from "cpeak"

type TileRoutesOptions = {
  db: MbtilesDb
}

const MVT_CONTENT_TYPE = "application/vnd.mapbox-vector-tile"
const CACHE_CONTROL = "public, max-age=86400, immutable"

/**
 * Validates path params as a tile coord and strips an optional `.pbf` suffix.
 * Throws a ZodError, which the server turns into a 400.
 */
function parseCoord(params: CpeakRequest["params"]): TileCoord {
  const { z, x, y } = params
  return TileCoordSchema.parse({ z, x, y: y.replace(/\.pbf$/i, "") })
}

export function tileRoutes(app: Cpeak, { db }: TileRoutesOptions) {
  const getTileHandler: Handler = async (request, response) => {
    const coord = parseCoord(request.params)
    const tile = await getTile(db, coord)

    if (!tile) {
      return response
        .status(404)
        .json({ error: `Tile ${tileKey(coord)} not found` })
    }

    const etag = `"${tileKey(coord)}"`
    response.setHeader("etag", etag)
    response.setHeader("cache-control", CACHE_CONTROL)

    // A re-validating client only needs the status, and a 304 must carry no body.
    if (request.headers["if-none-match"] === etag) {
      response.status(304).end()
      return
    }

    // Stored bytes are already gzipped MVT, so they go out as they are. MapLibre
    // hands the response straight to its tile parser and fails on compressed
    // bytes without the header. Cpeak has no binary helper.
    response.setHeader("content-type", MVT_CONTENT_TYPE)
    response.setHeader("content-encoding", "gzip")
    response.setHeader("content-length", tile.tileData.byteLength)
    response.status(200).end(tile.tileData)
  }

  // A Cpeak `:param` matches a whole path segment, so this one route answers both
  // `{z}/{x}/{y}` and `{z}/{x}/{y}.pbf`. A second `.pbf` route would hit the
  // same router node and throw as a duplicate at boot.
  app.route("get", "/tiles/:z/:x/:y", getTileHandler)
}
