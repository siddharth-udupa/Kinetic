import React from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { LocationStatus } from "@/hooks/useActivityRecorder"
import { useTheme } from "@/components/ui/theme"

export type GpsHeaderBannerProps = {
  status: "idle" | "recording" | "paused" | "finished"
  locationStatus?: LocationStatus
  isBackgroundActive: boolean
  onToggleExpand?: () => void
  onRequestPermissions?: () => void
}

export default function GpsHeaderBanner({
  status,
  locationStatus = "acquired",
  isBackgroundActive,
  onToggleExpand,
  onRequestPermissions,
}: GpsHeaderBannerProps) {
  const { colors } = useTheme()

  // Each branch picks a whole variant, so the plate, its edge, its label and the
  // glyph stay on the same status hue instead of being themed individually.
  let bannerBg = "bg-success-soft"
  let borderBg = "border-success-text"
  let textColor = "text-success-text"
  let iconName: keyof typeof Ionicons.glyphMap = "cellular"
  let iconColor = colors.success
  let statusText = "GPS Acquired"

  if (locationStatus === "disabled") {
    bannerBg = "bg-danger-soft"
    borderBg = "border-danger-text"
    textColor = "text-danger-text"
    iconName = "warning-outline"
    iconColor = colors.danger
    statusText = "Location Service Turned Off"
  } else if (locationStatus === "denied") {
    bannerBg = "bg-danger-soft"
    borderBg = "border-danger-text"
    textColor = "text-danger-text"
    iconName = "alert-circle-outline"
    iconColor = colors.danger
    statusText = "Location Permission Denied"
  } else if (locationStatus === "acquiring") {
    bannerBg = "bg-warning-soft"
    borderBg = "border-warning-text"
    textColor = "text-warning-text"
    iconName = "compass-outline"
    iconColor = colors.warning
    statusText = "Acquiring Location..."
  } else {
    if (status === "paused") {
      statusText = "GPS Paused"
      bannerBg = "bg-warning-soft"
      borderBg = "border-warning-text"
      textColor = "text-warning-text"
      iconName = "pause-circle-outline"
      iconColor = colors.warning
    } else if (status === "recording") {
      statusText = isBackgroundActive ? "GPS Active (High Precision)" : "GPS Active"
      bannerBg = "bg-success-soft"
      borderBg = "border-success-text"
      textColor = "text-success-text"
      iconName = "cellular"
      iconColor = colors.success
    } else {
      statusText = "GPS Acquired"
      bannerBg = "bg-success-soft"
      borderBg = "border-success-text"
      textColor = "text-success-text"
      iconName = "cellular"
      iconColor = colors.success
    }
  }

  const isClickable = (locationStatus === "disabled" || locationStatus === "denied") && !!onRequestPermissions

  return (
    <TouchableOpacity
      disabled={!isClickable}
      onPress={onRequestPermissions}
      activeOpacity={0.8}
      className={`${bannerBg} rounded-t-2xl px-4 py-2.5 flex-row justify-center items-center relative border-t border-x ${borderBg}`}
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name={iconName} size={16} color={iconColor} />
        <Text className={`text-xs font-black ${textColor} tracking-wide text-center uppercase`}>
          {statusText}
        </Text>
      </View>

      {onToggleExpand && (
        <TouchableOpacity
          onPress={onToggleExpand}
          className="absolute right-3.5 p-1"
          accessibilityLabel="Toggle metrics expand"
        >
          <Ionicons name="resize-outline" size={16} color={iconColor} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

