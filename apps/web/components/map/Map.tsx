"use client"

import dynamic from 'next/dynamic'
import type { UserLocation } from '@/hooks/useUserLocation'

const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-muted animate-pulse rounded" />,
})

type MapProps = {
  encodedPolyline?: string
  isStatic?: boolean
  isChangeable: boolean
  userLocation?: UserLocation | null
}

export default function MapView({
  encodedPolyline,
  isStatic,
  isChangeable,
  userLocation,
}: MapProps) {
  return (
    <MapClient
      encodedPolyline={encodedPolyline}
      isStatic={isStatic}
      isChangeable={isChangeable}
      userLocation={userLocation}
    />
  )
}
