import { useMemo } from "react"
import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  PrimaryButton,
  Segmented,
  SlideHeading,
  SlideShell,
  ThemePreview,
  type IconName,
} from "./primitives"
import { useTheme } from "@/hooks/useTheme"
import { THEME_LABELS, TIME_LABELS } from "./prefs"
import type { OnboardingPrefs } from "@/hooks/useOnboarding"

type Props = {
  prefs: OnboardingPrefs
  onChange: <K extends keyof OnboardingPrefs>(key: K, value: OnboardingPrefs[K]) => void
  onNext: () => void
}

const THEMES: { value: OnboardingPrefs["theme"]; icon: IconName }[] = [
  { value: "system", icon: "phone-portrait-outline" },
  { value: "light", icon: "sunny-outline" },
  { value: "dark", icon: "moon-outline" },
]

/**
 * Theme and time format, with the theme applied to the running app.
 *
 * Choosing a look is a visual decision, so tapping a card repaints the screen
 * immediately — including this one. `onPreviewTheme` resolves through the same
 * NativeWind scheme everything else reads from, so there is no separate "preview
 * mode" to get out of sync.
 */
export default function AppearanceSlide({ prefs, onChange, onNext }: Props) {
  const { colors } = useTheme()

  // Captured once so the sample clock does not re-render on every tick.
  const sampleTime = useMemo(() => new Date(), [])

  function formatSample(format: OnboardingPrefs["timeFormat"]): string {
    const hours = sampleTime.getHours()
    const minutes = String(sampleTime.getMinutes()).padStart(2, "0")
    if (format === "24h") {
      return `${String(hours).padStart(2, "0")}:${minutes}`
    }
    const suffix = hours >= 12 ? "PM" : "AM"
    const twelve = hours % 12 === 0 ? 12 : hours % 12
    return `${twelve}:${minutes} ${suffix}`
  }

  return (
    <SlideShell
      footer={
        <PrimaryButton
          label="Continue"
          icon="arrow-forward"
          onPress={onNext}
        />
      }
    >
      <SlideHeading
        icon="color-palette-outline"
        title="Make it yours"
        subtitle="Pick a look and the app changes as you tap — so you can see it before you commit."
      />

      {/* Theme */}
      <Text
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: colors.inkMuted }}
      >
        Theme
      </Text>

      <View className="flex-row gap-2.5 mb-7">
        {THEMES.map((option) => {
          const selected = prefs.theme === option.value
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange("theme", option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={THEME_LABELS[option.value]}
              className="flex-1 rounded-2xl border-2 p-2.5 active:opacity-80"
              style={{
                borderColor: selected ? colors.accent : colors.line,
                backgroundColor: selected ? colors.accentSoft : colors.surface,
              }}
            >
              <ThemePreview scheme={option.value} />

              <View className="flex-row items-center gap-1.5 mt-2.5">
                <Ionicons
                  name={option.icon}
                  size={14}
                  color={selected ? colors.accent : colors.inkMuted}
                />
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: selected ? colors.accentText : colors.inkSecondary }}
                >
                  {THEME_LABELS[option.value]}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {/* Time format, with a live sample of the difference. */}
      <Text
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: colors.inkMuted }}
      >
        Time format
      </Text>

      <View
        className="rounded-2xl border px-4 py-4"
        style={{ borderColor: colors.line, backgroundColor: colors.surface }}
      >
        <Segmented
          value={prefs.timeFormat}
          onChange={(v) => onChange("timeFormat", v)}
          options={[
            { label: "24-hour", value: "24h" },
            { label: "12-hour", value: "12h" },
          ]}
        />

        <View
          className="flex-row items-center justify-between rounded-xl px-3.5 py-3 mt-3"
          style={{ backgroundColor: colors.surfaceMuted }}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="time-outline" size={15} color={colors.inkMuted} />
            <Text className="text-[13px]" style={{ color: colors.inkSecondary }}>
              {TIME_LABELS[prefs.timeFormat]} clock
            </Text>
          </View>
          <Text className="text-[15px] font-semibold" style={{ color: colors.ink }}>
            {formatSample(prefs.timeFormat)}
          </Text>
        </View>
      </View>
    </SlideShell>
  )
}
