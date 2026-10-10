import { View, Text, TouchableOpacity, StatusBar } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/components/ui/theme"

export type ActivityNotFoundProps = {
  onBack: () => void
}

export default function ActivityNotFound({ onBack }: ActivityNotFoundProps) {
  const { isDark, colors } = useTheme()

  return (
    <View className="flex-1 bg-activity-page items-center justify-center px-6">
      {/* Follows the scheme, or dark glyphs land on the dark page. */}
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View className="w-20 h-20 rounded-full bg-activity-card border border-activity-line items-center justify-center mb-4">
        <Ionicons name="alert-circle-outline" size={40} color={colors.accent} />
      </View>
      <Text className="text-activity-ink text-xl font-bold tracking-tight">
        Activity Not Found
      </Text>

      <Text className="text-activity-ink-muted text-sm text-center mt-2 mb-6 leading-5">
        This activity doesn't exist, may have been deleted, or is temporarily unavailable.
      </Text>
      <TouchableOpacity
        onPress={onBack}
        className="bg-accent px-6 py-3 rounded-xl flex-row items-center active:opacity-80"
      >
        <Ionicons name="arrow-back" size={18} color={colors.onAccent} />
        <Text className="text-on-accent font-bold text-sm ml-2">Go Back</Text>
      </TouchableOpacity>
    </View>
  )
}
