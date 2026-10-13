import { View, Text, TouchableOpacity } from "react-native"
import { Ionicons, Feather } from "@expo/vector-icons"
import { useTheme } from "@/hooks/useTheme"

export type ActivitySocialBarProps = {
  onKudosPress?: () => void
  onCommentPress?: () => void
  onSharePress?: () => void
}

export default function ActivitySocialBar({
  onKudosPress,
  onCommentPress,
  onSharePress,
}: ActivitySocialBarProps) {
  const { colors } = useTheme()

  return (
    <View className="flex-row items-center px-5 mb-7">
      <TouchableOpacity
        onPress={onKudosPress}
        className="flex-1 flex-row items-center justify-center bg-activity-card border border-activity-line rounded-2xl py-3 mr-1.5"
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Give kudos"
      >
        <Ionicons name="thumbs-up-outline" size={17} color={colors.accentText} />
        <Text className="text-activity-ink text-[11px] font-bold ml-1.5">Kudos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onCommentPress}
        className="flex-1 flex-row items-center justify-center bg-activity-card border border-activity-line rounded-2xl py-3 mx-0.75"
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="View comments"
      >
        <Ionicons name="chatbubble-outline" size={16} color={colors.purpleText} />
        <Text className="text-activity-ink text-[11px] font-bold ml-1.5">Comments</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onSharePress}
        className="flex-1 flex-row items-center justify-center bg-activity-card border border-activity-line rounded-2xl py-3 ml-1.5"
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Share activity"
      >
        <Feather name="share-2" size={16} color={colors.info} />
        <Text className="text-activity-ink text-[11px] font-bold ml-1.5">Share</Text>
      </TouchableOpacity>
    </View>
  )
}
