import React from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/hooks/useTheme"

export type FloatingMapControlsProps = {
  is3dMode: boolean
  onOpenLayerPicker: () => void
  onToggle3dMode: () => void
  onRecenterLocation: () => void
  onOpenInfo: () => void
}

export default function FloatingMapControls({
  is3dMode,
  onOpenLayerPicker,
  onToggle3dMode,
  onRecenterLocation,
  onOpenInfo,
}: FloatingMapControlsProps) {
  const { colors } = useTheme()

  return (
    <View className="px-4 mb-3 flex-row justify-between items-end">
      <TouchableOpacity
        onPress={onOpenInfo}
        className="w-10 h-10 rounded-full bg-surface/90 border border-line justify-center items-center shadow-md active:scale-95"
        accessibilityLabel="Map info"
      >
        <Ionicons name="information-outline" size={20} color={colors.inkSecondary} />
      </TouchableOpacity>

      <View className="flex-col items-center gap-3">
        <TouchableOpacity
          onPress={onOpenLayerPicker}
          className="w-11 h-11 rounded-full bg-surface border border-line justify-center items-center shadow-lg active:scale-95"
          accessibilityLabel="Choose map style"
        >
          <Ionicons name="layers-outline" size={20} color={colors.ink} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggle3dMode}
          className={`w-11 h-11 rounded-full border justify-center items-center shadow-lg active:scale-95 ${
            is3dMode
              ? "bg-accent border-accent"
              : "bg-surface border-line"
          }`}
          accessibilityLabel="Toggle 3D mode"
        >
          <Text
            className={`font-black text-xs ${
              is3dMode ? "text-on-accent" : "text-ink"
            }`}
          >
            3D
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRecenterLocation}
          className="w-11 h-11 rounded-full bg-surface border border-line justify-center items-center shadow-lg active:scale-95"
          accessibilityLabel="Recenter location"
        >
          <Ionicons name="locate-outline" size={20} color={colors.ink} />
        </TouchableOpacity>
      </View>
    </View>
  )
}
