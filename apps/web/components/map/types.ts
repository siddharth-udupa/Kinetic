/** One alternative from a route search. `id` only needs to be unique within
 *  the set, so the engine's rank is enough. */
export type MapRoute = {
  id: string
  polyline: string
}
