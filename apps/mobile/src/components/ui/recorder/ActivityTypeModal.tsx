import React from "react"
import { View, Text, TouchableOpacity, Modal } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { ActivityTypes } from "@repo/types"
import { useTheme } from "@/components/ui/theme"

export type ActivityTypeModalProps = {
  visible: boolean
  activityType: ActivityTypes
  onSelectActivity: (type: ActivityTypes) => void
  onClose: () => void
}

export default function ActivityTypeModal({
  visible,
  activityType,
  onSelectActivity,
  onClose,
}: ActivityTypeModalProps) {
  const { colors } = useTheme()

  const options: Array<{ type: ActivityTypes; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { type: "run", label: "Run", icon: "footsteps" },
    { type: "ride", label: "Ride", icon: "bicycle" },
    { type: "walk", label: "Walk", icon: "walk" },
  ]

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-overlay justify-center items-center p-6">
        <View className="bg-surface rounded-3xl p-6 w-full max-w-sm border border-line shadow-2xl">
          <Text className="text-ink text-lg font-bold mb-4">
            Select Activity Type
          </Text>

          {options.map((opt) => {
            const isSelected = activityType === opt.type
            return (
              <TouchableOpacity
                key={opt.type}
                onPress={() => {
                  onSelectActivity(opt.type)
                  onClose()
                }}
                className={`flex-row items-center p-3.5 rounded-xl mb-2.5 border ${
                  isSelected
                    ? "bg-accent-soft border-accent"
                    : "bg-surface-muted-hover border-line"
                }`}
              >
                <Ionicons name={opt.icon} size={24} color={colors.accent} />
                <Text className="font-bold text-ink text-base ml-3 flex-1">
                  {opt.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                )}
              </TouchableOpacity>
            )
          })}

          <TouchableOpacity
            onPress={onClose}
            className="mt-3 py-3 rounded-xl bg-surface-muted items-center"
          >
            <Text className="font-semibold text-ink-secondary">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
