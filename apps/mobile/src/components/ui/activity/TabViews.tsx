import React from "react"
import { View, Text, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/components/ui/theme"
import type { TabType } from "./TabNavigation"
import type { DistanceUnit, ElevationUnit, SpeedUnit } from "@repo/units"

const ActivityAnalysisTab = React.lazy(() => import("./AnalysisTab"))

/**
 * The boundary itself is a class, so the palette is read here and the panel is
 * handed down rather than calling the hook from `render()`.
 */
function ChartErrorPanel() {
  const { colors } = useTheme()

  return (
    <View className="bg-danger-soft border border-danger/40 rounded-2xl p-6 items-center justify-center my-2">
      <Ionicons name="alert-circle-outline" size={36} color={colors.warning} />
      <Text className="text-warning font-bold text-sm mt-2 text-center">
        Unable to render chart
      </Text>
      <Text className="text-warning-text text-xs mt-1 text-center leading-5">
        The native chart views are not available in this build. Rebuild the app to enable chart rendering.
      </Text>
    </View>
  )
}

export type ActivityTabViewsProps = {
  activeTab: TabType
  streams?: Array<{
    distanceData: number[]
    altitudeData: number[]
    speedData: number[]
  }>
  preferences?: {
    distanceUnit: DistanceUnit
    elevationUnit: ElevationUnit
    speedUnit: SpeedUnit
  }
}

class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Chart ErrorBoundary caught error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ChartErrorPanel />
    }
    return this.props.children
  }
}

export default function ActivityTabViews({
  activeTab,
  streams,
  preferences,
}: ActivityTabViewsProps) {
  const { colors } = useTheme()

  if (activeTab === "analysis") {
    const stream = streams && streams.length > 0 ? streams[0] : undefined
    return (
      <ChartErrorBoundary>
        <React.Suspense
          fallback={
            <View className="bg-activity-panel border border-activity-line rounded-2xl p-8 items-center justify-center my-2">
              <ActivityIndicator size="small" color={colors.accent} />
              <Text className="text-activity-ink-muted text-xs mt-2">Loading analysis chart...</Text>
            </View>
          }
        >
          <ActivityAnalysisTab
            distanceData={stream?.distanceData}
            altitudeData={stream?.altitudeData}
            speedData={stream?.speedData}
            distanceUnit={preferences?.distanceUnit}
            elevationUnit={preferences?.elevationUnit}
            speedUnit={preferences?.speedUnit}
          />
        </React.Suspense>
      </ChartErrorBoundary>
    )
  }

  if (activeTab === "segments") {
    return (
      <View className="bg-activity-panel border border-activity-line rounded-2xl p-5 my-2">
        <View className="w-12 h-12 rounded-2xl bg-purple-soft items-center justify-center mb-4">
          <Ionicons name="git-commit-outline" size={25} color={colors.purpleText} />
        </View>
        <Text className="text-activity-ink font-black text-lg">Matched segments</Text>
        <Text className="text-activity-ink-muted text-sm mt-1 leading-5">
          2 segment efforts were recorded on this route.
        </Text>
        <View className="flex-row items-center bg-activity-card border border-activity-line rounded-xl px-3 py-3 mt-4">
          <Ionicons name="sparkles-outline" size={16} color={colors.warning} />
          <Text className="text-activity-ink-secondary text-xs font-semibold ml-2">Segment matching is ready</Text>
        </View>
      </View>
    )
  }

  if (activeTab === "best_efforts") {
    return (
      <View className="bg-activity-panel border border-activity-line rounded-2xl p-5 my-2">
        <View className="w-12 h-12 rounded-2xl bg-warning-soft items-center justify-center mb-4">
          <Ionicons name="trophy-outline" size={25} color={colors.warning} />
        </View>
        <Text className="text-activity-ink font-black text-lg">Personal records</Text>
        <Text className="text-activity-ink-muted text-sm mt-1 leading-5">
          Your best 5k pace effort was achieved during this session.
        </Text>
        <View className="flex-row items-center bg-activity-card border border-activity-line rounded-xl px-3 py-3 mt-4">
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
          <Text className="text-activity-ink-secondary text-xs font-semibold ml-2">Effort analysis complete</Text>
        </View>
      </View>
    )
  }

  return null
}
