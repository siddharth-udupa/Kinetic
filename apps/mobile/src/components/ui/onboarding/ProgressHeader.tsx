import { useEffect } from "react"
import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useOnboardingTheme } from "./theme"

type Props = {
  /** 1-based. */
  step: number
  total: number
  /**
   * Omit to hide the skip action. The username slide passes nothing, so the
   * row keeps its height and the layout never jumps as the user advances.
   */
  onSkip?: () => void
}

/**
 * Single source of "how far along am I".
 *
 * One continuous bar rather than a bar plus a dot strip: the old screen showed
 * both, which said the same thing twice. A minimum width keeps the first step
 * from reading as an empty track.
 */
export default function ProgressHeader({ step, total, onSkip }: Props) {
  const { colors } = useOnboardingTheme()
  const progress = useSharedValue(step / total)

  useEffect(() => {
    progress.value = withTiming(step / total, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    })
  }, [progress, step, total])

  const fill = useAnimatedStyle(() => ({
    width: `${Math.max(progress.value * 100, 7)}%`,
  }))

  return (
    <View className="px-6">
      <View className="flex-row items-center justify-between h-11">
        <Text
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: colors.textMuted }}
        >
          Step {step} of {total}
        </Text>

        {onSkip ? (
          <Pressable
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip setup"
            hitSlop={8}
            className="h-9 pl-4 pr-3 flex-row items-center gap-1 rounded-full active:opacity-70"
            style={{ backgroundColor: colors.cardMuted }}
          >
            <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
              Skip
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </Pressable>
        ) : (
          <View className="h-9" />
        )}
      </View>

      <View
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: colors.border }}
      >
        <Animated.View
          style={[
            { height: 6, borderRadius: 3, backgroundColor: colors.accent },
            fill,
          ]}
        />
      </View>
    </View>
  )
}
