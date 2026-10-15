import { z } from "zod"

/**
 * A tile coordinate in XYZ order, the `{z}/{x}/{y}` clients ask for. z is coerced so
 * route params and CLI input validate; the file declares its own minzoom/maxzoom.
 */
export const TileCoordSchema = z
  .object({
    z: z.coerce.number().int().min(0),
    x: z.coerce.number().int().min(0),
    y: z.coerce.number().int().min(0),
  })
  .refine((coord) => coord.x < 2 ** coord.z && coord.y < 2 ** coord.z, {
    message: "x and y must be smaller than 2^z",
  })

export type TileCoord = z.infer<typeof TileCoordSchema>

/** Stable textual id of a tile, also used as its ETag. */
export function tileKey({ z, x, y }: TileCoord): string {
  return `${z}/${x}/${y}`
}

/**
 * The row MBTiles stores. MBTiles indexes in TMS, which flips Y: 11/327/791 is stored
 * as 2^11 - 1 - 791, i.e. 1256.
 */
export function toStorageRow(y: number, z: number): number {
  return 2 ** z - 1 - y
}
