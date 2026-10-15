import React from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { ActivityTypes } from "@repo/types"
import { useTheme } from "@/hooks/useTheme"


export type BottomControlPanelProps = {
  status: "idle" | "recording" | "paused" | "finished"
  activityType: ActivityTypes
  selectedRoute: string | null
  bottomInset: number
  onOpenActivityModal: () => void
  onStartRecording: () => void
  onPauseRecording: () => void
  onResumeRecording: () => void
  onFinishRecording: () => void
  onOpenRouteModal: () => void
}

export default function BottomControlPanel({
  status,
  activityType,
  selectedRoute,
  bottomInset,
  onOpenActivityModal,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onFinishRecording,
  onOpenRouteModal,
}: BottomControlPanelProps) {
  const { colors } = useTheme()

  const getActivityIcon = (type: ActivityTypes) => {
    switch (type) {
      case "ride":
        return <Ionicons name="bicycle" size={32} color={colors.accent} />
      case "walk":
        return <Ionicons name="walk" size={32} color={colors.accent} />
      default:
        return <MaterialCommunityIcons name="run" size={34} color={colors.accent} />
    }
  }

  const getActivityLabel = (type: ActivityTypes) => {
    switch (type) {
      case "ride":
        return "Ride"
      case "walk":
        return "Walk"
      default:
        return "Run"
    }
  }

  return (
    <View
      style={{ paddingBottom: Math.max(bottomInset + 16, 28) }}
      className="bg-surface rounded-t-[36px] shadow-2xl pt-3 px-6 justify-between border-t border-line-muted"
    >
      <View className="w-10 h-1 bg-ink-muted rounded-full self-center mt-1 mb-4" />

      <View className="my-1 py-1">
        {status === "idle" && (
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={onOpenActivityModal}
              activeOpacity={0.8}
              className="items-center w-24"
            >
              <View className="w-[72px] h-[72px] rounded-full bg-accent-soft justify-center items-center relative">
                {getActivityIcon(activityType)}
                <View className="absolute top-0 right-0 bg-accent w-5 h-5 rounded-full justify-center items-center border-2 border-surface">
                  <Ionicons name="checkmark" size={11} color={colors.onAccent} />
                </View>
              </View>
              <Text className="text-[13px] font-semibold text-ink mt-2 text-center capitalize">
                {getActivityLabel(activityType)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onStartRecording}
              activeOpacity={0.85}
              className="w-[84px] h-[84px] rounded-full bg-accent justify-center items-center shadow-lg shadow-accent/40 active:scale-95"
            >
              <Ionicons name="play" size={44} color={colors.onAccent} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onOpenRouteModal}
              activeOpacity={0.8}
              className="items-center w-24"
            >
              <View className="w-[72px] h-[72px] rounded-full bg-surface-muted justify-center items-center">
                <Ionicons name="git-network-outline" size={28} color={colors.inkSecondary} />
              </View>
              <Text className="text-[13px] font-semibold text-ink mt-2 text-center leading-tight">
                {selectedRoute ? "Route\nAdded" : "Add\nRoute"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "recording" && (
          <View className="w-full px-1 py-1">
            <TouchableOpacity
              onPress={onPauseRecording}
              activeOpacity={0.85}
              className="w-full h-16 rounded-2xl bg-warning flex-row items-center justify-center shadow-lg active:scale-98"
            >
              <Ionicons name="pause" size={28} color={colors.onAccent} />
              <Text className="text-on-accent font-bold text-lg tracking-wider ml-3">
                PAUSE
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {(status === "paused" || status === "finished") && (
          <View className="w-full flex-row items-center gap-3 px-1 py-1">
            <TouchableOpacity
              onPress={onResumeRecording}
              activeOpacity={0.85}
              className="flex-1 h-16 rounded-2xl bg-success flex-row items-center justify-center shadow-lg active:scale-98"
            >
              <Ionicons name="play" size={26} color={colors.onAccent} style={{ marginLeft: 2 }} />
              <Text className="text-on-accent font-bold text-base tracking-wider ml-2">
                RESUME
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onFinishRecording}
              activeOpacity={0.85}
              className="flex-1 h-16 rounded-2xl bg-danger flex-row items-center justify-center shadow-lg active:scale-98"
            >
              <Ionicons name="square" size={22} color={colors.onAccent} />
              <Text className="text-on-accent font-bold text-base tracking-wider ml-2">
                FINISH
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}
