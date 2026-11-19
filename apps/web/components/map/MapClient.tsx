'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, LineString, Point } from 'geojson'
import { TileLayers } from './TileLayers'
import { decodePolyline } from '@repo/gpx'
import { getMapLibreStyle, getTileProviderView, DEFAULT_TILE_PROVIDER, type TileProviderId } from '@repo/maps'
import { useTheme } from '@/hooks/useTheme'
import type { UserLocation } from '@/hooks/useUserLocation'

type MapClientProps = {
  encodedPolyline?: string
  isStatic?: boolean
  isChangeable: boolean
  userLocation?: UserLocation | null
  /** Crosshair mode: the next map click becomes the start point. */
  isPicking?: boolean
  onPickLocation?: (fix: { lat: number; lng: number }) => void
}

function syncRouteLayer(
  map: maplibregl.Map,
  route: Feature<LineString> | null,
  color: string
) {
  const source = map.getSource('route') as maplibregl.GeoJSONSource | undefined

  if (!route) {
    if (map.getLayer('routeLine')) map.removeLayer('routeLine')
    if (source) map.removeSource('route')
    return
  }

  if (source) {
    source.setData(route)
    return
  }

  map.addSource('route', {
    type: 'geojson',
    data: route,
  })

  map.addLayer({
    id: 'routeLine',
    type: 'line',
    source: 'route',
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': color,
      'line-width': 4,
      'line-opacity': 0.9,
    },
  })
}

/* The athlete's position is the same two-circle mark the native map uses:
   a soft accent halo under a solid accent dot with an `on-accent` ring. */
function syncUserLocationLayer(
  map: maplibregl.Map,
  location: UserLocation | null,
  dotColor: string,
  ringColor: string
) {
  const source = map.getSource('userLocation') as maplibregl.GeoJSONSource | undefined

  if (!location) {
    if (map.getLayer('userLocationDot')) map.removeLayer('userLocationDot')
    if (map.getLayer('userLocationHalo')) map.removeLayer('userLocationHalo')
    if (source) map.removeSource('userLocation')
    return
  }

  const data: Feature<Point> = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [location.lng, location.lat],
    },
    properties: {},
  }

  if (source) {
    source.setData(data)
    map.setPaintProperty('userLocationHalo', 'circle-color', dotColor)
    map.setPaintProperty('userLocationDot', 'circle-color', dotColor)
    map.setPaintProperty('userLocationDot', 'circle-stroke-color', ringColor)
    return
  }

  map.addSource('userLocation', {
    type: 'geojson',
    data,
  })

  map.addLayer({
    id: 'userLocationHalo',
    type: 'circle',
    source: 'userLocation',
    paint: {
      'circle-radius': 14,
      'circle-color': dotColor,
      'circle-opacity': 0.25,
    },
  })

  map.addLayer({
    id: 'userLocationDot',
    type: 'circle',
    source: 'userLocation',
    paint: {
      'circle-radius': 7,
      'circle-color': dotColor,
      'circle-stroke-width': 2.5,
      'circle-stroke-color': ringColor,
    },
  })
}

/* Metres between two fixes, for telling a real move from the watch tightening
   its accuracy a few times in a row. */
function distanceMetres(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
) {
  const earthRadius = 6_371_000
  const toRadians = Math.PI / 180
  const dLat = (b.lat - a.lat) * toRadians
  const dLng = (b.lng - a.lng) * toRadians
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * toRadians) *
      Math.cos(b.lat * toRadians) *
      Math.sin(dLng / 2) ** 2
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)))
}

/* A watched fix arrives several times as the platform refines it. Below this
   the movement is accuracy noise — recentring on it would make the map twitch
   under the visitor — so only a correction past it moves the camera. */
const RECENTER_THRESHOLD_METRES = 100

export default function MapClient({
  encodedPolyline,
  isStatic = false,
  isChangeable,
  userLocation,
  isPicking = false,
  onPickLocation,
}: MapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  /* Effects must key off the live map instance, not just `mapRef`: React can
     mount, discard and re-create the map (Strict Mode does exactly this), and a
     camera or layer applied to the discarded instance would never be repeated. */
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const fittedPolylineRef = useRef<string | null>(null)
  /* The fix that last centred the camera, and which map it was centred on. A
     retry (or a refined fix) should move the map again; a re-render of the same
     fix, or a pan the visitor made, should not. */
  const centeredOnRef = useRef<{
    map: maplibregl.Map
    lng: number
    lat: number
  } | null>(null)
  /* `style.load` fires once per style, before the source tiles finish. Track it
     explicitly: `isStyleLoaded()` can still be false afterwards when a source is
     unreachable, and a listener added that late would never fire. The map itself
     records which instance is ready, so a stale map cannot mark a new one. */
  const styleReadyRef = useRef<maplibregl.Map | null>(null)
  const [currentProviderId, setCurrentProviderId] = useState<TileProviderId>(DEFAULT_TILE_PROVIDER)
  // MapLibre paints from a literal, not a class, so read the route colour off the palette.
  const { colors } = useTheme()

  const points = useMemo(() => {
    return encodedPolyline ? decodePolyline(encodedPolyline) : []
  }, [encodedPolyline])

  const routeGeoJSON = useMemo<Feature<LineString> | null>(() => {
    if (points.length < 2) return null
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: points.map((p) => [p.lng, p.lat] as [number, number]),
      },
      properties: {},
    }
  }, [points])

  const cameraBounds = useMemo<[[number, number], [number, number]] | null>(() => {
    if (points.length < 2) return null
    const lngs = points.map((p) => p.lng)
    const lats = points.map((p) => p.lat)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ]
  }, [points])

  // The default provider has bounded coverage, so open on the view it declares
  // rather than a world city whose tiles it does not contain.
  const providerView = getTileProviderView(DEFAULT_TILE_PROVIDER)

  /* A fix can land before this component mounts (the page asks for it on load),
     so open on the athlete when it is already known; a fix that arrives later is
     animated by the effect below. Otherwise a granted permission still opened on
     the provider's city and the map read as the wrong location. */
  const defaultCenter: [number, number] = points.length > 0
    ? [points[0]!.lng, points[0]!.lat]
    : userLocation
      ? [userLocation.lng, userLocation.lat]
      : providerView.center
        ? [providerView.center[0], providerView.center[1]]
        : [-0.09, 51.505]

  const defaultZoom = userLocation ? 15 : (providerView.center?.[2] ?? 13)

  useEffect(() => {
    if (!mapContainerRef.current) return

    const initialStyle = getMapLibreStyle(currentProviderId) as maplibregl.StyleSpecification

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: defaultCenter,
      zoom: defaultZoom,
      interactive: !isStatic,
      attributionControl: !isStatic ? undefined : false,
    })

    const handleStyleLoad = () => {
      styleReadyRef.current = map
    }
    map.on('style.load', handleStyleLoad)

    if (!isStatic) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
    }

    mapRef.current = map
    fittedPolylineRef.current = null
    setMapInstance(map)

    return () => {
      map.off('style.load', handleStyleLoad)
      if (styleReadyRef.current === map) styleReadyRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [isStatic])

  /* Draws the route once the map is ready, and again whenever a new loop
     replaces the old one. Kept out of the map-building effect so a new route
     does not recreate the map and reset the camera. */
  useEffect(() => {
    const map = mapInstance
    if (!map) return

    const drawRoute = () => {
      syncRouteLayer(map, routeGeoJSON, colors.accent)

      if (!routeGeoJSON) {
        fittedPolylineRef.current = null
        return
      }

      if (!cameraBounds || fittedPolylineRef.current === encodedPolyline) return

      map.fitBounds(cameraBounds, {
        padding: 40,
        maxZoom: 16,
        animate: false,
      })
      fittedPolylineRef.current = encodedPolyline ?? null
    }

    if (styleReadyRef.current === map || map.isStyleLoaded()) {
      drawRoute()
    } else {
      map.once('style.load', drawRoute)
    }

    return () => {
      map.off('style.load', drawRoute)
    }
  }, [mapInstance, routeGeoJSON, cameraBounds, encodedPolyline, colors.accent])

  /* The fix arrives after the permission prompt, so the dot is painted on a
     later render too and re-applied after a tile-provider style swap. */
  useEffect(() => {
    const map = mapInstance
    if (!map) return

    const drawUserLocation = () => {
      syncUserLocationLayer(map, userLocation ?? null, colors.accent, colors.onAccent)
    }

    if (styleReadyRef.current === map || map.isStyleLoaded()) {
      drawUserLocation()
    } else {
      map.once('style.load', drawUserLocation)
    }

    return () => {
      map.off('style.load', drawUserLocation)
    }
  }, [mapInstance, userLocation, colors.accent, colors.onAccent])

  /* Picking a start point: while the crosshair is armed, the next click on the
     map is the visitor's correction. The handler is only attached in that mode,
     so ordinary map clicks keep their normal meaning. */
  useEffect(() => {
    const map = mapInstance
    if (!map || !isPicking || !onPickLocation) return

    const canvas = map.getCanvas()
    const previousCursor = canvas.style.cursor
    canvas.style.cursor = "crosshair"

    const handleClick = (event: maplibregl.MapMouseEvent) => {
      onPickLocation({ lat: event.lngLat.lat, lng: event.lngLat.lng })
    }

    map.on("click", handleClick)

    return () => {
      map.off("click", handleClick)
      canvas.style.cursor = previousCursor
    }
  }, [mapInstance, isPicking, onPickLocation])

  /* An accepted permission should put the athlete in the middle of the screen.
     The map may already open on the fix (see `defaultCenter`), in which case
     there is nothing to animate. A later, different fix — a retry after a
     refusal, or the watch refining a coarse first answer — moves the camera
     again, because a dot in the right place under a map panned to the old one
     still reads as wrong. A refinement under the threshold is only the accuracy
     estimate moving, so it updates the dot without dragging the map. Panning
     afterwards is the visitor's choice, and a loop fitted from a route request
     must not be pulled back to the start point. The camera does not need the
     style, so move it now rather than waiting for `style.load`. */
  useEffect(() => {
    const map = mapInstance
    if (!map || !userLocation || encodedPolyline) return

    const previous = centeredOnRef.current
    // A new map has to be positioned even if the fix itself has not changed.
    const isFirstFixForMap = previous?.map !== map
    const movedMetres =
      !isFirstFixForMap && previous
        ? distanceMetres(previous, userLocation)
        : Number.POSITIVE_INFINITY

    if (movedMetres < RECENTER_THRESHOLD_METRES) return

    const current = map.getCenter()
    const alreadyThere =
      Math.abs(current.lng - userLocation.lng) < 1e-6 &&
      Math.abs(current.lat - userLocation.lat) < 1e-6

    if (!alreadyThere) {
      map.flyTo({
        center: [userLocation.lng, userLocation.lat],
        // Only the first fix picks a zoom. A refinement pans at whatever zoom
        // the visitor has chosen instead of undoing their look around.
        zoom: isFirstFixForMap ? 15 : map.getZoom(),
        duration: 900,
      })
    }

    centeredOnRef.current = {
      map,
      lng: userLocation.lng,
      lat: userLocation.lat,
    }
  }, [mapInstance, userLocation, encodedPolyline])

  /* Repaints the route on a theme switch. Not a dep of the map-building effect
     above: that would tear down and re-create the map, losing the camera. */
  useEffect(() => {
    const map = mapInstance
    if (!map?.getLayer('routeLine')) return

    map.setPaintProperty('routeLine', 'line-color', colors.accent)
  }, [mapInstance, colors.accent])

  const handleSelectProvider = (newProviderId: TileProviderId) => {
    setCurrentProviderId(newProviderId)
    const map = mapRef.current
    if (!map) return

    const newStyle = getMapLibreStyle(newProviderId) as maplibregl.StyleSpecification
    styleReadyRef.current = null
    map.setStyle(newStyle)

    map.once('style.load', () => {
      styleReadyRef.current = map
      syncRouteLayer(map, routeGeoJSON, colors.accent)
      syncUserLocationLayer(map, userLocation ?? null, colors.accent, colors.onAccent)
    })
  }

  return (
    <div className={`relative w-full h-full min-h-full ${isStatic ? 'static-map-container' : ''}`}>
      <div ref={mapContainerRef} className="w-full h-full min-h-full rounded overflow-hidden" />

      <TileLayers
        isChangeable={isChangeable}
        currentProviderId={currentProviderId}
        onSelectProvider={handleSelectProvider}
      />
    </div>
  )
}
