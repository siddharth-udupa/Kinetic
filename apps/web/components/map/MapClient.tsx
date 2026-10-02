'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { TileLayers } from './TileLayers'
import { decodePolyline } from '@repo/gpx'
import { getMapLibreStyle, DEFAULT_TILE_PROVIDER, type TileProviderId } from '@repo/maps'
import { COLORS } from '@repo/shared'

type MapClientProps = {
  encodedPolyline?: string
  isStatic?: boolean
  isChangeable: boolean
}

export default function MapClient({
  encodedPolyline,
  isStatic = false,
  isChangeable,
}: MapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [currentProviderId, setCurrentProviderId] = useState<TileProviderId>(DEFAULT_TILE_PROVIDER)

  const points = useMemo(() => {
    return encodedPolyline ? decodePolyline(encodedPolyline) : []
  }, [encodedPolyline])

  const routeGeoJSON = useMemo(() => {
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

  const defaultCenter: [number, number] =
    points.length > 0 ? [points[0]!.lng, points[0]!.lat] : [-0.09, 51.505]

  const updateRouteLayer = (map: maplibregl.Map) => {
    if (!routeGeoJSON) return

    if (map.getSource('route')) {
      const source = map.getSource('route') as maplibregl.GeoJSONSource
      source.setData(routeGeoJSON)
    } else {
      map.addSource('route', {
        type: 'geojson',
        data: routeGeoJSON,
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
          'line-color': COLORS.light.accent,
          'line-width': 4,
          'line-opacity': 0.9,
        },
      })
    }
  }

  useEffect(() => {
    if (!mapContainerRef.current) return

    const initialStyle = getMapLibreStyle(currentProviderId) as maplibregl.StyleSpecification

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: defaultCenter,
      zoom: 13,
      interactive: !isStatic,
      attributionControl: !isStatic ? undefined : false,
    })

    if (!isStatic) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
    }

    map.on('load', () => {
      updateRouteLayer(map)
      if (cameraBounds) {
        map.fitBounds(cameraBounds, {
          padding: 40,
          maxZoom: 16,
          animate: false,
        })
      }
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [isStatic])

  const handleSelectProvider = (newProviderId: TileProviderId) => {
    setCurrentProviderId(newProviderId)
    const map = mapRef.current
    if (!map) return

    const newStyle = getMapLibreStyle(newProviderId) as maplibregl.StyleSpecification
    map.setStyle(newStyle)

    map.once('style.load', () => {
      updateRouteLayer(map)
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
