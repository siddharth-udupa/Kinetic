import React from "react"
import { View, Text } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/hooks/useTheme"

export type ActivityOverviewTabProps = {
  distance: string | number
  duration: string
  pace: string | number
  elevGain: string | number
  elevLoss: string | number
  averageSpeed?: string
  maxSpeed?: string
  distanceUnit?: "metric" | "imperial"
  elevationUnit?: "meters" | "feet"
  speedUnit?: "km/h" | "mph" | "m/s"
  location?: string | null
  startTime?: string | Date | null
  endTime?: string | Date | null
}

type IconName = React.ComponentProps<typeof Ionicons>["name"]

type StatCardProps = {
  icon: IconName
  label: string
  value: string
  unit?: string
  accent?: "orange" | "green" | "purple" | "blue"
}

function StatCard({ icon, label, value, unit, accent = "orange" }: StatCardProps) {
  const { colors } = useTheme()

  // Built from the resolved palette so the tile hues follow the athlete's scheme.
  const accents = {
    orange: { icon: colors.accent, background: colors.accentSoft },
    green: { icon: colors.success, background: colors.successSoft },
    purple: { icon: colors.purpleText, background: colors.purpleSoft },
    blue: { icon: colors.info, background: colors.infoSoft },
  }
  const tone = accents[accent]

  return (
    <View className="flex-1 min-h-[108px] bg-activity-card border border-activity-line rounded-2xl p-3.5 mr-2 mb-3">
      <View className="w-8 h-8 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: tone.background }}>
        <Ionicons name={icon} size={16} color={tone.icon} />
      </View>
      <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-activity-ink-muted mb-1">
        {label}
      </Text>
      <View className="flex-row items-baseline">
        <Text className="text-[19px] font-black text-activity-ink tracking-tight">{value}</Text>
        {unit ? <Text className="text-[11px] font-bold text-activity-ink-muted ml-1">{unit}</Text> : null}
      </View>
    </View>
  )
}

function formatTime(value: string | Date | null | undefined) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not recorded"

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function ActivityOverviewTab({
  distance,
  duration,
  pace,
  elevGain,
  elevLoss,
  averageSpeed = "-",
  maxSpeed = "-",
  distanceUnit = "metric",
  elevationUnit = "meters",
  speedUnit = "km/h",
  location,
  startTime,
  endTime,
}: ActivityOverviewTabProps) {
  const { colors } = useTheme()
  const distanceLabel = distanceUnit === "imperial" ? "mi" : "km"
  const elevationLabel = elevationUnit === "feet" ? "ft" : "m"
  const speedLabel = speedUnit === "m/s" ? "m/s" : speedUnit

  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <View>
          {/* `accent-text`, not `accent`: raw orange is 3.4:1 on this panel. */}
          <Text className="text-[10px] font-black uppercase tracking-[2px] text-accent-text">
            The workout
          </Text>
          <Text className="text-activity-ink-muted text-xs mt-1">Your session at a glance</Text>
        </View>
        <View className="flex-row items-center bg-success-soft rounded-full px-2.5 py-1.5">
          <View className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
          <Text className="text-[10px] font-bold text-success-text">COMPLETED</Text>
        </View>
      </View>

      {/* Primary distance metric */}
      <View className="bg-accent rounded-[26px] p-5 mb-3 overflow-hidden">
        <View className="absolute -right-8 -top-12 w-36 h-36 rounded-full border-[18px] border-on-accent/10" />
        <View className="absolute -right-1 -bottom-16 w-40 h-40 rounded-full border-[20px] border-on-accent/10" />
        <View className="flex-row items-center justify-between mb-5">
          <Text className="text-on-accent/80 text-[11px] font-black uppercase tracking-[1.8px]">
            Total distance
          </Text>
          <Ionicons name="map-outline" size={20} color={colors.onAccent} />
        </View>
        <View className="flex-row items-baseline">
          <Text className="text-on-accent text-[54px] font-black leading-none tracking-[-2px]">
            {distance}
          </Text>
          <Text className="text-on-accent/80 text-lg font-bold ml-2">{distanceLabel}</Text>
        </View>
        <View className="flex-row items-center mt-4">
          <Ionicons name="flag-outline" size={14} color={colors.onAccent} />
          <Text className="text-on-accent/80 text-xs font-semibold ml-1.5">Route completed</Text>
        </View>
      </View>

      {/* Time and pace */}
      <View className="flex-row mb-4">
        <View className="flex-1 bg-activity-card border border-activity-line rounded-2xl p-4 mr-2">
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-lg bg-purple-soft items-center justify-center mr-2">
              <Ionicons name="timer-outline" size={15} color={colors.purpleText} />
            </View>
            <Text className="text-activity-ink-muted text-[10px] font-bold uppercase tracking-[1.2px]">
              Duration
            </Text>
          </View>
          <Text className="text-activity-ink text-[25px] font-black tracking-tight">{duration}</Text>
        </View>

        <View className="flex-1 bg-activity-card border border-activity-line rounded-2xl p-4 ml-1">
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-lg bg-success-soft items-center justify-center mr-2">
              <Ionicons name="speedometer-outline" size={15} color={colors.success} />
            </View>
            <Text className="text-activity-ink-muted text-[10px] font-bold uppercase tracking-[1.2px]">
              Avg pace
            </Text>
          </View>
          <Text className="text-activity-ink text-[25px] font-black tracking-tight">{pace}</Text>
        </View>
      </View>

      {/* Detailed metrics */}
      <View className="bg-activity-panel border border-activity-line rounded-2xl px-3 pt-3 mb-4">
        <View className="flex-row items-center justify-between px-1 pb-3">
          <Text className="text-activity-ink font-black text-base">Performance metrics</Text>
          <Ionicons name="analytics-outline" size={18} color={colors.accent} />
        </View>
        <View className="flex-row">
          <StatCard
            icon="trending-up-outline"
            label="Elevation gain"
            value={String(elevGain)}
            unit={elevationLabel}
            accent="orange"
          />
          <StatCard
            icon="trending-down-outline"
            label="Elevation loss"
            value={String(elevLoss)}
            unit={elevationLabel}
            accent="purple"
          />
        </View>
        <View className="flex-row">
          <StatCard
            icon="speedometer-outline"
            label="Average speed"
            value={averageSpeed}
            unit={speedLabel}
            accent="green"
          />
          <StatCard
            icon="flash-outline"
            label="Max speed"
            value={maxSpeed}
            unit={speedLabel}
            accent="blue"
          />
        </View>
      </View>

      {/* Session facts */}
      <View className="bg-activity-panel border border-activity-line rounded-2xl px-4">
        <View className="flex-row items-center py-4 border-b border-activity-line">
          <View className="w-8 h-8 rounded-xl bg-info-soft items-center justify-center mr-3">
            <Ionicons name="location-outline" size={16} color={colors.info} />
          </View>
          <View className="flex-1">
            <Text className="text-activity-ink-muted text-[10px] font-bold uppercase tracking-[1.3px] mb-1">
              Location
            </Text>
            <Text className="text-activity-ink text-sm font-semibold" numberOfLines={1}>
              {location || "No location added"}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center py-4">
          <View className="w-8 h-8 rounded-xl bg-purple-soft items-center justify-center mr-3">
            <Ionicons name="time-outline" size={16} color={colors.purpleText} />
          </View>
          <View className="flex-1">
            <Text className="text-activity-ink-muted text-[10px] font-bold uppercase tracking-[1.3px] mb-1">
              Started
            </Text>
            <Text className="text-activity-ink text-sm font-semibold">{formatTime(startTime)}</Text>
          </View>
          {endTime ? (
            <View className="items-end">
              <Text className="text-activity-ink-muted text-[10px] font-bold uppercase tracking-[1.3px] mb-1">
                Finished
              </Text>
              <Text className="text-activity-ink text-sm font-semibold">{formatTime(endTime)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}
