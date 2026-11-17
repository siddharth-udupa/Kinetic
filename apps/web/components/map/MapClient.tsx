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

export default function MapClient({
  encodedPolyline,
  isStatic = false,
  isChangeable,
  userLocation,
}: MapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  /* Effects must key off the live map instance, not just `mapRef`: React can
     mount, discard and re-create the map (Strict Mode does exactly this), and a
     camera or layer applied to the discarded instance would never be repeated. */
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const fittedPolylineRef = useRef<string | null>(null)
  const centeredOnMapRef = useRef<maplibregl.Map | null>(null)
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

  const defaultCenter: [number, number] =
    points.length > 0
      ? [points[0]!.lng, points[0]!.lat]
      : providerView.center
        ? [providerView.center[0], providerView.center[1]]
        : [-0.09, 51.505]

  const defaultZoom = providerView.center?.[2] ?? 13

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

  /* An accepted permission should put the athlete in the middle of the screen.
     Only once per map: panning afterwards is the visitor's choice, and a loop
     fitted from a route request must not be pulled back to the start point. The
     camera does not need the style, so move it now rather than waiting for
     `style.load`. */
  useEffect(() => {
    const map = mapInstance
    if (!map || !userLocation || encodedPolyline || centeredOnMapRef.current === map) return

    map.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 15,
      duration: 900,
    })
    centeredOnMapRef.current = map
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
