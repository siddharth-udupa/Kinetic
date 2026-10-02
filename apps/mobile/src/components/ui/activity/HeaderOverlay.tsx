import React, { useState } from "react"
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, ActivityIndicator } from "react-native"
import { Ionicons, Feather } from "@expo/vector-icons"
import { useOnboardingTheme } from "@/components/ui/onboarding/theme"

export type ActivityHeaderOverlayProps = {
  topInset: number
  onBack: () => void
  onShare?: () => void
  onMore?: () => void
  onDeleteActivity?: () => void
  isDeleting?: boolean
}

export default function ActivityHeaderOverlay({
  topInset,
  onBack,
  onShare,
  onMore,
  onDeleteActivity,
  isDeleting = false,
}: ActivityHeaderOverlayProps) {
  const { colors } = useOnboardingTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleMorePress = () => {
    if (onMore) {
      onMore()
    }
    setIsMenuOpen(true)
  }

  const handleDeletePress = () => {
    setIsMenuOpen(false)
    if (onDeleteActivity) {
      onDeleteActivity()
    }
  }

  return (
    <>
      <View
        style={{ paddingTop: Math.max(topInset, 16) }}
        className="absolute top-0 left-0 right-0 px-4 flex-row items-center justify-between z-20 pointer-events-box-none"
      >
        <TouchableOpacity
          onPress={onBack}
          className="w-10 h-10 rounded-full bg-surface/90 border border-line-strong items-center justify-center shadow-md active:opacity-80"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View className="flex-row items-center space-x-2">
          <TouchableOpacity
            onPress={onShare}
            className="w-10 h-10 rounded-full bg-surface/90 border border-line-strong items-center justify-center shadow-md active:opacity-80"
          >
            <Feather name="share-2" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleMorePress}
            className="w-10 h-10 rounded-full bg-surface/90 border border-line-strong items-center justify-center shadow-md active:opacity-80"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Options Menu Modal */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
          <View className="flex-1 bg-overlay justify-end">
            <TouchableWithoutFeedback>
              <View className="bg-surface rounded-t-3xl p-5 border-t border-line shadow-2xl">
                {/* Header indicator */}
                <View className="items-center mb-4">
                  <View className="w-10 h-1.5 rounded-full bg-line-strong mb-3" />
                  <Text className="text-base font-bold text-ink">
                    Activity Options
                  </Text>
                </View>

                {/* Options List */}
                <View className="mb-4">
                  <TouchableOpacity
                    onPress={handleDeletePress}
                    disabled={isDeleting}
                    className="flex-row items-center px-4 py-3.5 rounded-xl bg-danger-soft border border-danger/50 active:opacity-75"
                  >
                    <View className="w-9 h-9 rounded-full bg-danger-soft items-center justify-center mr-3">
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Feather name="trash-2" size={18} color={colors.danger} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-danger-text">
                        Delete Activity
                      </Text>
                      <Text className="text-xs text-danger-text">
                        Permanently remove this activity from your account
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Cancel Button */}
                <TouchableOpacity
                  onPress={() => setIsMenuOpen(false)}
                  className="w-full py-3.5 rounded-xl bg-surface-muted items-center active:opacity-80"
                >
                  <Text className="text-base font-semibold text-ink">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  )
}
