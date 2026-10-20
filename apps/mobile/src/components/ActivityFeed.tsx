import { FlatList, TouchableOpacity, View, Text, ActivityIndicator } from "react-native"
import ActivtyCard from "./ActivtyCard"
import { Ionicons } from "@expo/vector-icons"
import type { ActivityCardType } from "@repo/types"
import { DEFAULT_PREFERENCES, usePreferences } from "@/lib/preferencesStore"
import type { User } from "@/lib/auth-client"
import { useTheme } from "@/hooks/useTheme"

interface ActivityFeedProps {
  user: User
  activities: ActivityCardType[]
  contentContainerStyle?: any
  refreshing?: boolean
  onRefresh?: () => void
  isLoading?: boolean
  error?: string | null
}

export default function ActivityFeed({
  user,
  activities,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  isLoading = false,
  error = null,
}: ActivityFeedProps) {
  const { preferences } = usePreferences()
  const { colors } = useTheme()

  if (isLoading && activities.length === 0) {
    return (
      <View className="flex-1 justify-center items-center p-8 bg-page">
        <ActivityIndicator size="large" color={colors.accent} />
        <Text className="text-ink-muted text-sm mt-3 font-medium">
          Loading activities...
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      data={activities}
      keyExtractor={(item) => item.activityId}
      renderItem={({ item }) => (
        <ActivtyCard
          activity={item}
          preferences={preferences ?? DEFAULT_PREFERENCES}
          user={user}
        />
      )}
      ListEmptyComponent={
        error ? (
          <View className="p-8 items-center justify-center">
            <Text className="text-danger-text text-sm text-center font-medium">
              {error}
            </Text>
          </View>
        ) : (
          <View className="p-8 items-center justify-center">
            <Ionicons name="fitness-outline" size={48} color={colors.inkDisabled} />
            <Text className="text-ink-muted text-sm mt-2 text-center font-medium">
              No activities found yet.
            </Text>
          </View>
        )
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={contentContainerStyle}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  )
}
