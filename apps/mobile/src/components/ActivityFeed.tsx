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
      ListHeaderComponent={ListHeaderComponent}
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

// Header Banner Widget Component
function ListHeaderComponent() {
  const { colors } = useTheme()

  return (
    <View>
      <View className="bg-surface p-4 mb-2 border-b border-line flex-row items-center justify-between">
        <View>
          <Text className="text-ink-muted text-xs uppercase font-semibold">
            Weekly Goal
          </Text>
          <Text className="text-ink text-lg font-bold mt-0.5">
            24.6 / 35.0 km
          </Text>
          <View className="w-48 h-2 bg-surface-muted rounded-full mt-2 overflow-hidden">
            <View className="w-3/4 h-full bg-accent rounded-full" />
          </View>
        </View>
        <TouchableOpacity className="bg-surface-muted px-3 py-2 rounded-lg flex-row items-center border border-line-strong">
          <Ionicons name="trophy-outline" size={16} color={colors.accent} />
          <Text className="text-ink text-xs font-semibold ml-1.5">
            View Goals
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}