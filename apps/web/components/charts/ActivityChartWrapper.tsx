"use client"

import dynamic from "next/dynamic"
import type { DistanceUnit, ElevationUnit, SpeedUnit } from "@repo/units"

const ActivityChartsClient = dynamic(() => import("./ActivityChart"), {
  ssr: false,
  loading: () => <div className="h-115 w-full bg-surface-muted animate-pulse rounded" />,
})

type ActivityChartsProps = {
  distanceData: number[]
  altitudeData: number[]
  speedData: number[]
  distanceUnit: DistanceUnit
  elevationUnit: ElevationUnit
  speedUnit: SpeedUnit
}

export default function ActivityChartWrapper({
  distanceData,
  altitudeData,
  speedData,
  distanceUnit,
  elevationUnit,
  speedUnit
}: ActivityChartsProps) {
  return (
    <ActivityChartsClient
      distanceData={distanceData}
      altitudeData={altitudeData}
      speedData={speedData}
      distanceUnit={distanceUnit}
      elevationUnit={elevationUnit}
      speedUnit={speedUnit}
    />
  )
}