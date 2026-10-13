import React from "react"
import { View, Text, Image, TouchableOpacity } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useTheme } from "@/hooks/useTheme"
import { ActivityTypes } from "@repo/types"

export type ActivityAthleteHeaderProps = {
  userName: string
  createdAt: string | Date
  activityType: ActivityTypes
  title?: string | null
  description?: string | null
  avatarUrl?: string
  location?: string | null
  startTime?: string | Date | null
  endTime?: string | Date | null
  onAddDescription?: () => void
}

function formatTime(value: string | Date | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function ActivityAthleteHeader({
  userName,
  createdAt,
  activityType,
  title,
  description,
  avatarUrl = "https://avatar.iran.liara.run/public/48",
  location,
  startTime,
  endTime,
  onAddDescription,
}: ActivityAthleteHeaderProps) {
  const { colors } = useTheme()
  const formattedDate = new Date(createdAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const startLabel = formatTime(startTime)
  const endLabel = formatTime(endTime)

  const getIconName = (type: ActivityTypes) => {
    switch (type) {
      case "ride":
        return "bike"
      case "hike":
        return "hiking"
      case "swim":
        return "swim"
      case "walk":
        return "walk"
      default:
        return "run"
    }
  }

  return (
    <View className="mb-5">
      <View className="flex-row items-center justify-between mb-5">
        <View className="flex-row items-center flex-1 mr-3">
          <View className="w-12 h-12 rounded-2xl bg-activity-card border border-accent/50 items-center justify-center overflow-hidden">
            <Image source={{ uri: avatarUrl }} className="w-full h-full" />
          </View>
          <View className="flex-1 justify-center ml-3">
            <Text className="text-activity-ink font-black text-base leading-tight mb-1">{userName}</Text>
            <Text className="text-activity-ink-muted text-xs leading-none">{formattedDate}</Text>
          </View>
        </View>

        <View className="bg-accent-soft border border-accent/30 px-3 py-2 rounded-xl flex-row items-center">
          <MaterialCommunityIcons name={getIconName(activityType)} size={15} color={colors.accent} />
          <Text className="text-accent-text font-black text-[10px] uppercase tracking-[1px] ml-1.5 leading-none">
            {activityType}
          </Text>
        </View>
      </View>

      <View className="h-px bg-activity-line mb-5" />

      <Text className="text-activity-ink text-[30px] font-black tracking-[-0.5px] leading-[1.1] mb-2">
        {title || "Untitled activity"}
      </Text>
      {description ? (
        <Text className="text-activity-ink-secondary text-sm mb-4 leading-6">{description}</Text>
      ) : (
        <TouchableOpacity onPress={onAddDescription} className="mb-4 self-start active:opacity-70">
          <Text className="text-activity-ink-muted text-xs italic bg-activity-card border border-activity-line px-3 py-2 rounded-lg leading-tight">
            + Add a description
          </Text>
        </TouchableOpacity>
      )}

      <View className="flex-row items-center flex-wrap">
        {location ? (
          <View className="flex-row items-center bg-activity-card border border-activity-line rounded-full px-3 py-2 mr-2 mb-2">
            <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.info} />
            <Text className="text-activity-ink-secondary text-xs font-semibold ml-1.5" numberOfLines={1}>
              {location}
            </Text>
          </View>
        ) : null}
        {startLabel ? (
          <View className="flex-row items-center bg-activity-card border border-activity-line rounded-full px-3 py-2 mr-2 mb-2">
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.purpleText} />
            <Text className="text-activity-ink-secondary text-xs font-semibold ml-1.5">
              {startLabel}{endLabel ? ` – ${endLabel}` : ""}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}
