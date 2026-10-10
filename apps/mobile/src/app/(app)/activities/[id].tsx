import { useState, useEffect } from "react"
import { View, Dimensions, ActivityIndicator, StatusBar, Alert } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Redirect, useLocalSearchParams, useRouter } from "expo-router"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated"
import MapView from "@/components/map/Map"
import TileProviderPicker from "@/components/map/TileProviderPicker"
import { DEFAULT_TILE_PROVIDER, type TileProviderId } from "@repo/maps"
import { metersToDistance, metersToElevation, formatDurationShort, formatPace } from "@repo/units"
import type { ActivityDetailsType } from "@repo/types"
import { authClient, useSession } from "@/lib/auth-client"
import { removeActivityFromCache } from "@/hooks/useActivities"
import { useTheme } from "@/components/ui/theme"
import {
  ActivityNotFound,
  ActivityHeaderOverlay,
  ActivityAthleteHeader,
  ActivitySocialBar,
  ActivityTabNavigation,
  ActivityOverviewTab,
  ActivityTabViews,
  type TabType,
} from "@/components/ui/activity"

const { height: SCREEN_HEIGHT } = Dimensions.get("window")

const API_URL = process.env.EXPO_PUBLIC_API_URL!

function formatSpeed(metersPerSecond: number | null | undefined, unit: string) {
  if (metersPerSecond == null) return "—"

  if (unit === "m/s") return metersPerSecond.toFixed(2)
  if (unit === "mph") return (metersPerSecond * 2.23694).toFixed(1)
  return (metersPerSecond * 3.6).toFixed(1)
}

export default function ActivityDetailScreen() {
  const { data: session } = useSession()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isDark, colors } = useTheme()

  const [data, setdata] = useState<ActivityDetailsType | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [currentProviderId, setCurrentProviderId] = useState<TileProviderId>(DEFAULT_TILE_PROVIDER)

  // 3 snap positions (Y coordinate offset from top of screen)
  const EXPANDED_Y = SCREEN_HEIGHT * 0.08  // 8% from top
  const HALF_Y = SCREEN_HEIGHT * 0.50      // 50% from top
  const COLLAPSED_Y = SCREEN_HEIGHT * 0.78 // 78% from top

  // Reanimated bottom sheet shared values
  const translateY = useSharedValue(HALF_Y)
  const contextY = useSharedValue(HALF_Y)

  // Pan gesture for the drag handle and athlete header
  const handlePanGesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-16, 16])
    .onStart(() => {
      contextY.value = translateY.value
    })
    .onUpdate((event) => {
      let nextY = contextY.value + event.translationY
      if (nextY < EXPANDED_Y) {
        nextY = EXPANDED_Y + (nextY - EXPANDED_Y) * 0.2
      } else if (nextY > COLLAPSED_Y) {
        nextY = COLLAPSED_Y + (nextY - COLLAPSED_Y) * 0.2
      }
      translateY.value = nextY
    })
    .onEnd((event) => {
      const velocityY = event.velocityY
      const currentY = translateY.value

      let targetY = HALF_Y

      if (velocityY < -400) {
        // Fast swipe UP
        targetY = currentY > HALF_Y ? HALF_Y : EXPANDED_Y
      } else if (velocityY > 400) {
        // Fast swipe DOWN
        targetY = currentY < HALF_Y ? HALF_Y : COLLAPSED_Y
      } else {
        // Nearest snap point distance calculation
        const distToExpanded = Math.abs(currentY - EXPANDED_Y)
        const distToHalf = Math.abs(currentY - HALF_Y)
        const distToCollapsed = Math.abs(currentY - COLLAPSED_Y)

        if (distToExpanded <= distToHalf && distToExpanded <= distToCollapsed) {
          targetY = EXPANDED_Y
        } else if (distToCollapsed <= distToHalf && distToCollapsed <= distToExpanded) {
          targetY = COLLAPSED_Y
        } else {
          targetY = HALF_Y
        }
      }

      translateY.value = withSpring(targetY, {
        damping: 25,
        stiffness: 220,
        mass: 0.8,
      })
    })

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    }
  })

  useEffect(() => {
    async function fetchActivityData() {
      if (!id) {
        setIsLoading(false)
        return
      }
      try {
        const res = await authClient.$fetch<{ data: ActivityDetailsType }>(
          `${API_URL}/api/activities/${id}`
        )
        if (res?.data) {
          setdata(res.data.data)
        }
      } catch (err) {
        console.error("Fetch error:", err)
        setdata(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchActivityData()
  }, [id])

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace("/(app)/dashboard" as any)
    }
  }

  const handleDeleteActivity = () => {
    if (!id) return

    Alert.alert(
      "Delete Activity",
      "Are you sure you want to delete this activity? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true)
              const res: any = await authClient.$fetch(
                `${API_URL}/api/activities/${id}`,
                {
                  method: "DELETE",
                }
              )

              if (res?.error) {
                const errorMsg =
                  typeof res.error === "string"
                    ? res.error
                    : res.error?.message || "Failed to delete activity"
                Alert.alert("Error", errorMsg)
              } else {
                removeActivityFromCache(id)
                if (router.canGoBack()) {
                  router.back()
                } else {
                  router.replace("/(app)/dashboard" as any)
                }
              }
            } catch (err: any) {
              console.error("Delete error:", err)
              const errorMessage =
                err?.data?.error || err?.message || "Failed to delete activity. Please try again."
              Alert.alert("Error", errorMessage)
            } finally {
              setIsDeleting(false)
            }
          },
        },
      ]
    )
  }

  if (!session) {
    return <Redirect href={"/(auth)/sign-in" as any} />
  }

  if (isLoading) {
    /* The activity tier, not the app tier — this screen replaces the whole route and
       lands on the sheet's surface. */
    return (
      <View className="flex-1 bg-activity-page items-center justify-center">
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  if (!data) {
    return <ActivityNotFound onBack={handleBack} />
  }

  const distanceUnit = data.user?.preferences.distanceUnit ?? "metric"
  const elevationUnit = data.user?.preferences.elevationUnit ?? "meters"
  const paceUnit = data.user?.preferences.paceUnit ?? "min/km"
  const speedUnit = data.user?.preferences.speedUnit ?? "km/h"
  const distance = metersToDistance(data.distance, distanceUnit)
  const elevGain = metersToElevation(data.elevationGain, elevationUnit)
  const elevLoss = metersToElevation(data.elevationLoss, elevationUnit)
  const duration = formatDurationShort(data.duration)
  const pace = formatPace(data.duration, data.distance, paceUnit)
  const averageSpeed = data.duration > 0 ? data.distance / data.duration : null

  return (
    <View className="flex-1 bg-page">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* MAP LAYER (Interactive & Fixed Background Map) */}
      <View className="flex-1">
        <MapView
          encodedPolyline={data.encodedPolyline || undefined}
          isStatic={false}
          providerId={currentProviderId}
          style={{ width: "100%", height: "100%" }}
          boundsPadding={{
            top: Math.max(insets.top, 16) + 60,
            bottom: HALF_Y + 24,
            left: 28,
            right: 28,
          }}
        />

        {/* Top Header Floating Overlay (Back, Share, Actions) */}
        <ActivityHeaderOverlay
          topInset={insets.top}
          onBack={handleBack}
          onDeleteActivity={handleDeleteActivity}
          isDeleting={isDeleting}
        />

        {/* Floating Tile Provider Picker Button */}
        <TileProviderPicker
          currentProviderId={currentProviderId}
          onSelectProvider={(newProvider) => setCurrentProviderId(newProvider)}
          triggerStyle={{ top: Math.max(insets.top, 16) + 52, right: 16 }}
        />
      </View>

      {/* REANIMATED BOTTOM SHEET MODAL (Fixed Full Height with translateY Transform) */}
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: SCREEN_HEIGHT,
          },
          animatedSheetStyle,
        ]}
        className="bg-activity-page border-t border-activity-line rounded-t-[32px] shadow-2xl z-30 overflow-hidden"
      >
        {/* Drag Handle & Top Athlete Header Region */}
        <GestureDetector gesture={handlePanGesture}>
          <View className="w-full bg-activity-page">
            <View
              className="w-full items-center py-3.5 active:opacity-70"
              hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
              style={{ cursor: "grab" as any }}
            >
              <View className="w-12 h-1.5 rounded-full bg-activity-handle" />
            </View>

            <View className="px-5 pb-2">
              <ActivityAthleteHeader
                userName={data.user.name}
                createdAt={data.createdAt}
                activityType={data.type}
                title={data.title}
                description={data.description}
                avatarUrl={data.user.image ?? undefined}
                location={data.location}
                startTime={data.startTime}
                endTime={data.endTime}
              />
            </View>
          </View>
        </GestureDetector>

        {/* Keep scrolling inside the sheet without forwarding it to a parent scroll view.

            Background is the class, not an inline `colors.activityPage`: the sticky tab
            bar below needs an opaque fill, and two sources for one token is how half a
            screen ends up on the wrong scheme. */}
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          stickyHeaderHiddenOnScroll={false}
          stickyHeaderIndices={[1]}
          className="flex-1 bg-activity-page"
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom + 80, 100),
          }}
        >
          <ActivitySocialBar />

          <View className="z-10 bg-activity-page">
            <ActivityTabNavigation activeTab={activeTab} onSelectTab={setActiveTab} />
          </View>

          <View className="px-5">
            {activeTab === "overview" ? (
              <ActivityOverviewTab
                distance={distance}
                duration={duration}
                pace={pace}
                elevGain={elevGain}
                elevLoss={elevLoss}
                averageSpeed={formatSpeed(averageSpeed, speedUnit)}
                maxSpeed={formatSpeed(data.maxSpeedMps, speedUnit)}
                distanceUnit={distanceUnit}
                elevationUnit={elevationUnit}
                speedUnit={speedUnit}
                location={data.location}
                startTime={data.startTime}
                endTime={data.endTime}
              />
            ) : (
              <ActivityTabViews
                activeTab={activeTab}
                streams={data.streams}
                preferences={data.user?.preferences}
              />
            )}
          </View>
        </Animated.ScrollView>
      </Animated.View>
    </View>
  )
}
