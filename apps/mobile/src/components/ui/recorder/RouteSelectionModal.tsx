import React from "react"
import { View, Text, TouchableOpacity, Modal, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/hooks/useTheme"

export type RouteSelectionModalProps = {
  visible: boolean
  selectedRoute: string | null
  onSelectRoute: (routeName: string | null) => void
  onClose: () => void
}

export default function RouteSelectionModal({
  visible,
  selectedRoute,
  onSelectRoute,
  onClose,
}: RouteSelectionModalProps) {
  const { colors } = useTheme()

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-overlay justify-end">
        <View className="bg-surface rounded-t-3xl p-6 shadow-2xl">
          <View className="flex-row items-center justify-between mb-4 border-b border-line pb-3">
            <View className="flex-row items-center">
              <Ionicons name="git-network" size={20} color={colors.accent} />
              <Text className="text-ink font-bold text-lg ml-2">
                Select Route
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="bg-surface-muted p-1.5 rounded-full"
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => {
              onSelectRoute("Custom 5K Loop")
              onClose()
              Alert.alert("Route Loaded", "Custom 5K Loop route attached.")
            }}
            className={`p-4 rounded-xl border mb-3 flex-row items-center justify-between ${
              selectedRoute === "Custom 5K Loop"
                ? "bg-accent-soft border-accent"
                : "bg-surface-muted-hover border-line"
            }`}
          >
            <View>
              <Text className="font-bold text-ink text-base">
                Custom 5K Loop
              </Text>
              <Text className="text-xs text-ink-muted mt-0.5">
                5.0 km • 45m elevation
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
          </TouchableOpacity>

          {selectedRoute && (
            <TouchableOpacity
              onPress={() => {
                onSelectRoute(null)
                onClose()
              }}
              className="p-4 rounded-xl border border-dashed border-line-strong items-center justify-center mb-4"
            >
              <Text className="text-xs font-semibold text-danger-text">
                Clear Selected Route
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}
