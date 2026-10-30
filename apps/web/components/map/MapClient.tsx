'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, LineString } from 'geojson'
import { TileLayers } from './TileLayers'
import { decodePolyline } from '@repo/gpx'
import { getMapLibreStyle, getTileProviderView, DEFAULT_TILE_PROVIDER, type TileProviderId } from '@repo/maps'
import { useTheme } from '@/hooks/useTheme'

type MapClientProps = {
  encodedPolyline?: string
  isStatic?: boolean
  isChangeable: boolean
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

export default function MapClient({
  encodedPolyline,
  isStatic = false,
  isChangeable,
}: MapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const fittedPolylineRef = useRef<string | null>(null)
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

    if (!isStatic) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
    }

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [isStatic])

  /* Draws the route once the map is ready, and again whenever a new loop
     replaces the old one. Kept out of the map-building effect so a new route
     does not recreate the map and reset the camera. */
  useEffect(() => {
    const map = mapRef.current
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

    if (map.isStyleLoaded()) {
      drawRoute()
    } else {
      map.once('style.load', drawRoute)
    }

    return () => {
      map.off('style.load', drawRoute)
    }
  }, [routeGeoJSON, cameraBounds, encodedPolyline, colors.accent])

  /* Repaints the route on a theme switch. Not a dep of the map-building effect
     above: that would tear down and re-create the map, losing the camera. */
  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('routeLine')) return

    map.setPaintProperty('routeLine', 'line-color', colors.accent)
  }, [colors.accent])

  const handleSelectProvider = (newProviderId: TileProviderId) => {
    setCurrentProviderId(newProviderId)
    const map = mapRef.current
    if (!map) return

    const newStyle = getMapLibreStyle(newProviderId) as maplibregl.StyleSpecification
    map.setStyle(newStyle)

    map.once('style.load', () => {
      syncRouteLayer(map, routeGeoJSON, colors.accent)
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
