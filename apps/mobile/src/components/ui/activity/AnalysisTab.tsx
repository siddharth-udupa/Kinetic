import React from "react"
import { View, Text } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import ActivityChartWrapper from "@/components/charts/ActivityChartWrapper"
import { useTheme } from "@/hooks/useTheme"
import type { DistanceUnit, ElevationUnit, SpeedUnit } from "@repo/units"

/* The activity tier throughout: this renders inside the sheet, which stacks
   activityPage → activityPanel → activityCard over a map. */

export type ActivityAnalysisTabProps = {
  distanceData?: number[]
  altitudeData?: number[]
  speedData?: number[]
  distanceUnit?: DistanceUnit
  elevationUnit?: ElevationUnit
  speedUnit?: SpeedUnit
}

export default function ActivityAnalysisTab({
  distanceData,
  altitudeData,
  speedData,
  distanceUnit = "metric",
  elevationUnit = "meters",
  speedUnit = "km/h",
}: ActivityAnalysisTabProps) {
  const { colors } = useTheme()
  const hasData =
    distanceData &&
    altitudeData &&
    speedData &&
    distanceData.length > 0 &&
    altitudeData.length > 0

  if (!hasData) {
    return (
      <View className="bg-activity-card border border-activity-line rounded-2xl p-6 items-center justify-center my-4">
        <Ionicons name="stats-chart-outline" size={36} color={colors.accent} />
        <Text className="text-activity-ink font-bold text-sm mt-2">
          No Analysis Data
        </Text>
        <Text className="text-activity-ink-muted text-xs mt-1 text-center">
          Elevation or telemetry stream data is not available for this activity.
        </Text>
      </View>
    )
  }

  return (
    <View className="bg-activity-panel border border-activity-line rounded-2xl p-4 my-2">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Ionicons name="stats-chart" size={18} color={colors.accent} />
          <Text className="text-activity-ink font-bold text-sm">
            Elevation Profile
          </Text>
        </View>
      </View>

      <ActivityChartWrapper
        distanceData={distanceData}
        altitudeData={altitudeData}
        speedData={speedData}
        distanceUnit={distanceUnit}
        elevationUnit={elevationUnit}
        speedUnit={speedUnit}
      />
    </View>
  )
}
