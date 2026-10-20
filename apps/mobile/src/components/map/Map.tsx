import { useMemo } from "react"
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { decodePolyline } from "@repo/gpx"
import { getMapLibreStyle, getTileProviderView, DEFAULT_TILE_PROVIDER, tileProviders, type TileProviderId } from "@repo/maps"
import { useTheme } from "@/hooks/useTheme"

let MapLibreModule: typeof import("@maplibre/maplibre-react-native") | null = null

try {
  MapLibreModule = require("@maplibre/maplibre-react-native")
} catch (err) {
  MapLibreModule = null
}

export type MapProps = {
  encodedPolyline?: string
  isStatic?: boolean
  providerId?: TileProviderId
  style?: StyleProp<ViewStyle>
  boundsPadding?: { top: number; bottom: number; left: number; right: number }
  userLocation?: { latitude: number; longitude: number } | null
  livePoints?: Array<{ latitude: number; longitude: number }>
  recenterTrigger?: number
}

export default function MapView({
  encodedPolyline,
  isStatic = false,
  providerId = DEFAULT_TILE_PROVIDER,
  style,
  boundsPadding,
  userLocation,
  livePoints,
  recenterTrigger,
}: MapProps) {
  // MapLibre paint props take literal colours, so the layer colours come from
  // the theme hook rather than a CSS var.
  const { colors } = useTheme()

  const points = useMemo(() => {
    if (livePoints && livePoints.length > 0) {
      return livePoints.map((p) => ({ lat: p.latitude, lng: p.longitude }))
    }
    if (encodedPolyline) {
      return decodePolyline(encodedPolyline)
    }
    return []
  }, [livePoints, encodedPolyline])

  const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> | null = useMemo(
    () =>
      points.length >= 2
        ? {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: points.map((p) => [p.lng, p.lat]),
            },
            properties: {},
          }
        : null,
    [points]
  )

  const userLocationGeoJSON: GeoJSON.Feature<GeoJSON.Point> | null = useMemo(
    () =>
      userLocation
        ? {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [userLocation.longitude, userLocation.latitude],
            },
            properties: {},
          }
        : null,
    [userLocation]
  )

  const cameraBounds = useMemo(() => {
    if (!routeGeoJSON || points.length < 2) return null
    let minLng = Math.min(...points.map((p) => p.lng))
    let minLat = Math.min(...points.map((p) => p.lat))
    let maxLng = Math.max(...points.map((p) => p.lng))
    let maxLat = Math.max(...points.map((p) => p.lat))

    // Floor of ~400m on the bounding box, or short movements over-zoom.
    const MIN_DELTA = 0.004
    const lngDelta = maxLng - minLng
    const latDelta = maxLat - minLat

    if (lngDelta < MIN_DELTA) {
      const midLng = (minLng + maxLng) / 2
      minLng = midLng - MIN_DELTA / 2
      maxLng = midLng + MIN_DELTA / 2
    }

    if (latDelta < MIN_DELTA) {
      const midLat = (minLat + maxLat) / 2
      minLat = midLat - MIN_DELTA / 2
      maxLat = midLat + MIN_DELTA / 2
    }

    return [minLng, minLat, maxLng, maxLat] as import("@maplibre/maplibre-react-native").LngLatBounds
  }, [routeGeoJSON, points])

  const defaultView = useMemo(() => {
    if (userLocation) {
      return {
        center: [userLocation.longitude, userLocation.latitude] as [number, number],
        zoom: 15,
      }
    }

    // A provider with its own coverage (the South India tiles) carries the view
    // it should open on; unrestricted providers keep the world default.
    const providerView = getTileProviderView(providerId)
    return providerView.center
      ? {
          center: [providerView.center[0], providerView.center[1]] as [number, number],
          zoom: providerView.center[2],
        }
      : { center: [-0.09, 51.505] as [number, number], zoom: 15 }
  }, [providerId, userLocation])

  const mapStyle = useMemo(
    () => getMapLibreStyle(providerId),
    [providerId]
  )

  const activeProvider = tileProviders[providerId] || tileProviders[DEFAULT_TILE_PROVIDER]

  const containerStyles = [styles.container, style]
  const mapStyles = style ? [styles.map, style] : styles.map

  // MapLibre is native-only, so Expo Go and the web build get this placeholder.
  if (!MapLibreModule || !MapLibreModule.Map) {
    return (
      <View style={containerStyles} className="bg-page justify-center items-center relative overflow-hidden flex-1 w-full h-full">
        <View className="absolute inset-0 opacity-10 bg-line" />
        <View className="items-center justify-center p-4">
          <View className="relative mb-2 items-center justify-center">
            <MaterialCommunityIcons
              name="map-marker-path"
              size={48}
              color={colors.accent}
              opacity={0.8}
            />
            {userLocation && (
              <View className="absolute w-4 h-4 rounded-full bg-accent border-2 border-on-accent shadow-xs" />
            )}
          </View>
          <Text className="text-ink-secondary text-xs font-semibold mt-1">
            Map Route ({points.length} points)
          </Text>
          {userLocation ? (
            <Text className="text-accent text-[11px] font-bold mt-1 bg-accent-soft px-2.5 py-1 rounded-full border border-accent/30">
              User Location: {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}
            </Text>
          ) : (
            <Text className="text-ink-muted text-[10px] mt-0.5 text-center">
              Acquiring location...
            </Text>
          )}
          <Text className="text-ink-secondary text-[11px] font-medium mt-2 bg-surface/80 px-2.5 py-1 rounded-md border border-line">
            Active Style: {activeProvider.name}
          </Text>
        </View>
      </View>
    )
  }

  const { Map: MapLibreView, Camera, GeoJSONSource, Layer } = MapLibreModule

  return (
    <View style={containerStyles} className="bg-page overflow-hidden relative flex-1 w-full h-full">
      <MapLibreView
        style={mapStyles}
        mapStyle={mapStyle}
        dragPan={!isStatic}
        touchZoom={!isStatic}
        doubleTapZoom={!isStatic}
        doubleTapHoldZoom={!isStatic}
        touchPitch={false}
        attribution={false}
        logo={false}
        compass={false}
      >
        <Camera
          key={recenterTrigger ? `recenter-${recenterTrigger}` : undefined}
          maxZoom={16}
          minZoom={2}
          duration={recenterTrigger ? 500 : 0}
          {...(recenterTrigger && userLocation
            ? { center: [userLocation.longitude, userLocation.latitude], zoom: 16 }
            : cameraBounds
            ? {
                bounds: cameraBounds,
                padding: boundsPadding || { top: 24, bottom: 24, left: 24, right: 24 },
              }
            : { center: defaultView.center, zoom: defaultView.zoom })}
        />

        {routeGeoJSON && (
          <GeoJSONSource id="route" data={routeGeoJSON}>
            <Layer
              id="routeLine"
              type="line"
              paint={{
                "line-color": colors.accent,
                "line-width": 4,
                "line-opacity": 0.9,
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
          </GeoJSONSource>
        )}

        {userLocationGeoJSON && (
          <GeoJSONSource id="userLocationSource" data={userLocationGeoJSON}>
            <Layer
              id="userLocationHalo"
              type="circle"
              paint={{
                "circle-radius": 14,
                "circle-color": colors.accent,
                "circle-opacity": 0.25,
              }}
            />
            <Layer
              id="userLocationDot"
              type="circle"
              paint={{
                "circle-radius": 7,
                "circle-color": colors.accent,
                "circle-stroke-width": 2.5,
                "circle-stroke-color": colors.onAccent,
              }}
            />
          </GeoJSONSource>
        )}
      </MapLibreView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
    flex: 1,
  },
})
