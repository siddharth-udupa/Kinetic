import { Pressable, ScrollView, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { LoopRoute } from "@repo/validation"
import { useTheme } from "@/hooks/useTheme"
import { formatDistance, formatDuration } from "./routeFormat"

type RouteOptionsProps = {
  routes: LoopRoute[]
  /** The route drawn at full strength. Falls back to the best one when unset. */
  activeRouteId?: string
  onSelect: (route: LoopRoute) => void
}

/** The alternative loops a single request returned, laid along the bottom of
 *  the map. Selecting one promotes it on the map; the other routes stay faint
 *  so the shape of the options is still legible. */
export default function RouteOptions({
  routes,
  activeRouteId,
  onSelect,
}: RouteOptionsProps) {
  const { colors } = useTheme()

  if (routes.length === 0) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingBottom: 4,
        gap: 8,
      }}
    >
      {routes.map((route, index) => {
        const isActive =
          activeRouteId === String(route.rank) ||
          (!activeRouteId && index === 0)

        return (
          <Pressable
            key={route.rank}
            onPress={() => onSelect(route)}
            accessibilityRole="button"
            accessibilityLabel={`Route ${route.rank}: ${formatDistance(
              route.distanceMeters,
            )}, ${formatDuration(
              route.durationSeconds,
            )}, ${route.elevationGainMeters} metres of climbing`}
            accessibilityState={{ selected: isActive }}
            className={`w-36 shrink-0 gap-1 rounded-xl border bg-surface px-3 py-2.5 shadow-md active:opacity-80 ${
              isActive ? "border-accent" : "border-line"
            }`}
          >
            <View className="flex-row items-center justify-between gap-2">
              <Text
                className={`text-[10px] font-semibold uppercase tracking-widest ${
                  isActive ? "text-accent-text" : "text-ink-muted"
                }`}
              >
                {index === 0 ? "Best" : `Option ${index + 1}`}
              </Text>
              {isActive ? (
                <Ionicons
                  name="checkmark"
                  size={12}
                  color={colors.accentText}
                />
              ) : null}
            </View>

            <Text
              className="text-[15px] font-bold leading-none text-ink"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {formatDistance(route.distanceMeters)}
            </Text>

            <Text
              className="text-[11px] text-ink-secondary"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {formatDuration(route.durationSeconds)} ·{" "}
              {route.elevationGainMeters} m
            </Text>

            <Text
              className="text-[10px] text-ink-muted"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {(route.accuracy * 100).toFixed(1)}% from target
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
