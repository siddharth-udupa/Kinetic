import type {
  LayerSpecification,
  SourceSpecification,
} from "@maplibre/maplibre-gl-style-spec"
import {
  DEFAULT_TILE_PROVIDER,
  tileProviders,
  type TileProviderId,
} from "../providers"
import type {
  MapLibreSource,
  MapLibreStyle,
  RasterTileProvider,
  TileProvider,
  VectorTileLayer,
  VectorTileProvider,
} from "../types"

const SOURCE_ID = "base-map"
const SOURCE_LAYER_ID = "base-map-layer"

/** The provider for an id, falling back to the default. */
export function getTileProvider(
  id: TileProviderId = DEFAULT_TILE_PROVIDER
): TileProvider {
  return tileProviders[id] ?? tileProviders[DEFAULT_TILE_PROVIDER]
}

/** What the tileset covers, for a camera that frames it. */
export function getTileProviderView(
  id: TileProviderId = DEFAULT_TILE_PROVIDER
): Pick<VectorTileProvider, "bounds" | "center"> {
  const provider = getTileProvider(id)
  return provider.type === "vector"
    ? { bounds: provider.bounds, center: provider.center }
    : {}
}

/** One MapLibre source pointing at the provider's tiles. */
export function getTileSource(provider: TileProvider): MapLibreSource {
  const source: MapLibreSource = {
    type: provider.type,
    tiles: [provider.url.replace("{s}", "a").replace("{r}", "")],
    attribution: provider.attribution,
    minzoom: provider.minZoom ?? 0,
    maxzoom: provider.maxZoom ?? 14,
  }

  // A tileSize on a vector source makes MapLibre throw mid-load, so it stays
  // raster-only and only when the provider sets it.
  if (provider.type === "raster") source.tileSize = provider.tileSize ?? 256

  return source
}

function rasterLayers(provider: RasterTileProvider): VectorTileLayer[] {
  return [
    {
      id: SOURCE_LAYER_ID,
      type: "raster",
      source: SOURCE_ID,
      maxzoom: provider.maxZoom ?? 24,
    },
  ]
}

/**
 * A complete MapLibre style: one source plus the layers that render it. Vector
 * providers carry their own layer list (see `styles/`).
 */
export function getMapLibreStyle(
  id: TileProviderId = DEFAULT_TILE_PROVIDER
): MapLibreStyle {
  const provider = getTileProvider(id)
  const layers =
    provider.type === "vector" ? provider.layers : rasterLayers(provider)

  return {
    version: 8,
    ...(provider.type === "vector" && provider.glyphs
      ? { glyphs: provider.glyphs }
      : {}),
    sources: { [SOURCE_ID]: getTileSource(provider) as SourceSpecification },
    layers: layers as LayerSpecification[],
  }
}
