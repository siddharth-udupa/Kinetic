import { southIndiaLayers } from "./styles/southIndia"
import { TILE_GLYPHS_URL, TILE_SERVER_URL } from "./tileServer"
import type { TileProvider } from "./types"

export const tileProviders = {
  openstreetmap: {
    id: "openstreetmap",
    name: "OpenStreetMap (Standard)",
    type: "raster",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    tileSize: 256,
    maxZoom: 19,
  },

  esriSatellite: {
    id: "esriSatellite",
    name: "Esri World Imagery (Satellite)",
    type: "raster",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    tileSize: 256,
    maxZoom: 19,
  },

  southIndia: {
    id: "southIndia",
    name: "South India (Local mbtiles)",
    type: "vector",
    url: `${TILE_SERVER_URL}/tiles/{z}/{x}/{y}.pbf`,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    glyphs: TILE_GLYPHS_URL,
    minZoom: 4,
    maxZoom: 12,
    bounds: [73.193, 7.812, 81.638, 16.479],
    // Bangalore: the region tiles are most useful around, rather than the
    // geometric centre of the bounding box.
    center: [77.5946, 12.9716, 10],
    layers: southIndiaLayers,
  },
} satisfies Record<string, TileProvider>

export type TileProviderId = keyof typeof tileProviders

export const DEFAULT_TILE_PROVIDER: TileProviderId = "southIndia"
