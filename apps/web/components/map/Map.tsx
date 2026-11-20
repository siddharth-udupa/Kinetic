"use client"

import dynamic from 'next/dynamic'
import type { UserLocation } from '@/hooks/useUserLocation'
import type { MapRoute } from './types'

const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-muted animate-pulse rounded" />,
})

/** One alternative from a route search. `id` only needs to be unique within
 *  the set, so the engine's rank is enough. */
export type { MapRoute }

type MapProps = {
  encodedPolyline?: string
  /** A set of alternative routes. When present these replace `encodedPolyline`. */
  routes?: MapRoute[]
  /** Which route in `routes` is drawn at full strength; the rest stay faint. */
  activeRouteId?: string
  isStatic?: boolean
  isChangeable: boolean
  userLocation?: UserLocation | null
  isPicking?: boolean
  onPickLocation?: (fix: { lat: number; lng: number }) => void
}

export default function MapView({
  encodedPolyline,
  routes,
  activeRouteId,
  isStatic,
  isChangeable,
  userLocation,
  isPicking,
  onPickLocation,
}: MapProps) {
  return (
    <MapClient
      encodedPolyline={encodedPolyline}
      routes={routes}
      activeRouteId={activeRouteId}
      isStatic={isStatic}
      isChangeable={isChangeable}
      userLocation={userLocation}
      isPicking={isPicking}
      onPickLocation={onPickLocation}
    />
  )
}
