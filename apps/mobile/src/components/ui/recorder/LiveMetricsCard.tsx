import React from "react"
import { View, Text } from "react-native"
import GpsHeaderBanner from "./GpsHeaderBanner"
import type { LocationStatus } from "@/hooks/useActivityRecorder"

export type LiveMetricsCardProps = {
  formattedTime: string
  formattedPace: string
  formattedSpeed: string | number
  formattedDistance: string
  activityType: string
  status: "idle" | "recording" | "paused" | "finished"
  locationStatus?: LocationStatus
  pointsCount: number
  distanceMeters: number
  isBackgroundActive: boolean
  onToggleExpand?: () => void
  onRequestPermissions?: () => void
}

export default function LiveMetricsCard({
  formattedTime,
  formattedPace,
  formattedSpeed,
  formattedDistance,
  activityType,
  status,
  locationStatus,
  pointsCount,
  distanceMeters,
  isBackgroundActive,
  onToggleExpand,
  onRequestPermissions,
}: LiveMetricsCardProps) {
  const isPaceMode = activityType !== "ride"

  return (
    <View className="mx-4 mb-3">
      {/* Light Green / Dynamic Header Bar */}
      <GpsHeaderBanner
        status={status}
        locationStatus={locationStatus}
        isBackgroundActive={isBackgroundActive}
        onToggleExpand={onToggleExpand}
        onRequestPermissions={onRequestPermissions}
      />


      {/* 3-Column Metrics Grid */}
      <View className="bg-surface border border-line rounded-b-2xl p-4 shadow-xl flex-row justify-between items-center">
        {/* Column 1: Time */}
        <View className="flex-1 items-center">
          <Text className="text-ink text-2xl font-black tracking-tight">
            {formattedTime}
          </Text>
          <Text className="text-ink-muted text-xs font-semibold mt-0.5">
            Time
          </Text>
        </View>

        <View className="w-[1px] h-8 bg-line" />

        {/* Column 2: Split avg / Pace / Speed */}
        <View className="flex-1 items-center">
          <Text className="text-ink text-2xl font-black tracking-tight">
            {status === "idle" && pointsCount === 0
              ? "-:--"
              : isPaceMode
              ? formattedPace
              : `${formattedSpeed}`}
          </Text>
          <Text className="text-ink-muted text-xs font-semibold mt-0.5">
            {isPaceMode ? "Split avg. (/km)" : "Speed (km/h)"}
          </Text>
        </View>

        <View className="w-[1px] h-8 bg-line" />

        {/* Column 3: Distance */}
        <View className="flex-1 items-center">
          <Text className="text-ink text-2xl font-black tracking-tight">
            {status === "idle" && distanceMeters === 0 ? "0" : formattedDistance}
          </Text>
          <Text className="text-ink-muted text-xs font-semibold mt-0.5">
            Distance (km)
          </Text>
        </View>
      </View>
    </View>
  )
}
