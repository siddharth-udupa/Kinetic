import { useEffect, useMemo, useRef } from "react"
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import type { LngLatBounds } from "@maplibre/maplibre-react-native"
import { decodePolyline } from "@repo/gpx"
import { getMapLibreStyle, getTileProviderView, DEFAULT_TILE_PROVIDER, tileProviders, type TileProviderId } from "@repo/maps"
import { useTheme } from "@/hooks/useTheme"

let MapLibreModule: typeof import("@maplibre/maplibre-react-native") | null = null

try {
  MapLibreModule = require("@maplibre/maplibre-react-native")
} catch {
  MapLibreModule = null
}

/** One alternative from a route search. `id` only needs to be unique within
 *  the set, so the engine's rank is enough. */
export type MapRoute = {
  id: string
  polyline: string
}

export type MapProps = {
  encodedPolyline?: string
  /** A set of alternative routes. When present these replace `encodedPolyline`. */
  routes?: MapRoute[]
  /** Which route in `routes` is drawn at full strength; the rest stay faint. */
  activeRouteId?: string
  isStatic?: boolean
  providerId?: TileProviderId
  style?: StyleProp<ViewStyle>
  boundsPadding?: { top: number; bottom: number; left: number; right: number }
  userLocation?: { latitude: number; longitude: number } | null
  livePoints?: Array<{ latitude: number; longitude: number }>
  recenterTrigger?: number
  /** Crosshair mode: the next tap becomes the start point. */
  isPicking?: boolean
  onPickLocation?: (fix: { lat: number; lng: number }) => void
}

type RouteProperties = {
  id: string
  active: boolean
}

export default function MapView({
  encodedPolyline,
  routes,
  activeRouteId,
  isStatic = false,
  providerId = DEFAULT_TILE_PROVIDER,
  style,
  boundsPadding,
  userLocation,
  livePoints,
  recenterTrigger,
  isPicking = false,
  onPickLocation,
}: MapProps) {
  // MapLibre paint props take literal colours, so the layer colours come from
  // the theme hook rather than a CSS var.
  const { colors } = useTheme()

  const decodedRoutes = useMemo(() => {
    if (livePoints && livePoints.length > 0) {
      return [
        {
          id: "live",
          points: livePoints.map((p) => ({ lat: p.latitude, lng: p.longitude })),
        },
      ]
    }

    const inputs: MapRoute[] =
      routes && routes.length > 0
        ? routes
        : encodedPolyline
          ? [{ id: "route", polyline: encodedPolyline }]
          : []

    return inputs
      .map((route) => ({
        id: route.id,
        points: decodePolyline(route.polyline),
      }))
      .filter((route) => route.points.length >= 2)
  }, [livePoints, routes, encodedPolyline])

  /* A response with no selection yet (the first route is the best one) and an
     id that no longer exists both fall back to the first route. */
  const activeId = decodedRoutes.some((route) => route.id === activeRouteId)
    ? activeRouteId
    : decodedRoutes[0]?.id

  const routeGeoJSON: GeoJSON.FeatureCollection<
    GeoJSON.LineString,
    RouteProperties
  > | null = useMemo(() => {
    if (decodedRoutes.length === 0) return null

    const features = decodedRoutes.map<
      GeoJSON.Feature<GeoJSON.LineString, RouteProperties>
    >((route) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: route.points.map(
          (point) => [point.lng, point.lat] as [number, number],
        ),
      },
      properties: {
        id: route.id,
        active: route.id === activeId,
      },
    }))

    return {
      type: "FeatureCollection",
      // The active loop goes last so MapLibre paints it over the faint ones.
      features: [
        ...features.filter((feature) => !feature.properties.active),
        ...features.filter((feature) => feature.properties.active),
      ],
    }
  }, [decodedRoutes, activeId])

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
    const points = decodedRoutes.flatMap((route) => route.points)
    if (points.length < 2) return null
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

    return [minLng, minLat, maxLng, maxLat] as LngLatBounds
  }, [decodedRoutes])

  /* The Camera is declarative, so a cleared route would snap back to the
     provider default while the next loop is being built. Hold the last route
     bounds and only replace them when a new route arrives. */
  const lastBoundsRef = useRef<LngLatBounds | null>(null)
  useEffect(() => {
    if (cameraBounds) lastBoundsRef.current = cameraBounds
  }, [cameraBounds])

  const viewBounds = cameraBounds ?? lastBoundsRef.current

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

  const pointCount = decodedRoutes.reduce(
    (total, route) => total + route.points.length,
    0,
  )

  const containerStyles = [styles.container, style]
  const mapStyles = style ? [styles.map, style] : styles.map

  // MapLibre is native-only, so Expo Go and the web build get this placeholder.
  if (!MapLibreModule?.Map) {
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
            Map Route ({pointCount} points)
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
        /* Only armed while picking, so ordinary taps keep their normal meaning. */
        onPress={
          isPicking && onPickLocation
            ? (event) => {
                const [lng, lat] = event.nativeEvent.lngLat
                onPickLocation({ lat, lng })
              }
            : undefined
        }
      >
        <Camera
          key={recenterTrigger ? `recenter-${recenterTrigger}` : undefined}
          maxZoom={16}
          minZoom={2}
          duration={recenterTrigger ? 500 : 0}
          {...(recenterTrigger && userLocation
            ? { center: [userLocation.longitude, userLocation.latitude], zoom: 16 }
            : viewBounds
            ? {
                bounds: viewBounds,
                padding: boundsPadding || { top: 24, bottom: 24, left: 24, right: 24 },
              }
            : { center: defaultView.center, zoom: defaultView.zoom })}
        />

        {routeGeoJSON && (
          <GeoJSONSource id="routes" data={routeGeoJSON}>
            <Layer
              id="routesLine"
              type="line"
              paint={{
                "line-color": colors.accent,
                "line-width": ["case", ["get", "active"], 4.5, 3],
                "line-opacity": ["case", ["get", "active"], 0.95, 0.3],
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
