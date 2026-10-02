"use client"

import dynamic from 'next/dynamic'

const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-muted animate-pulse rounded" />,
})

type MapProps = {
  encodedPolyline?: string
  isStatic?: boolean
  isChangeable: boolean
}

export default function MapView({ encodedPolyline, isStatic, isChangeable }: MapProps) {
  return <MapClient encodedPolyline={encodedPolyline} isStatic={isStatic} isChangeable={isChangeable} />
}
