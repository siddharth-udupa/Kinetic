import { Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  ChoiceCard,
  PrimaryButton,
  SlideHeading,
  SlideShell,
} from "./primitives"
import { useOnboardingTheme } from "./theme"
import { SYSTEMS, type UnitSystem } from "./prefs"
import type { OnboardingPrefs } from "@/hooks/useOnboarding"

type Props = {
  prefs: OnboardingPrefs
  onChange: <K extends keyof OnboardingPrefs>(key: K, value: OnboardingPrefs[K]) => void
  onNext: () => void
}

/**
 * One decision, not five.
 *
 * The old units screen asked for distance, elevation, pace, speed and weight in
 * a single scroll of full-colour buttons. Choosing a system here settles all
 * five at once, which is the answer almost everyone would have given anyway.
 */
export default function UnitsSystemSlide({ prefs, onChange, onNext }: Props) {
  const { colors } = useOnboardingTheme()
  const system: UnitSystem = prefs.distanceUnit === "imperial" ? "imperial" : "metric"

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
        icon="options-outline"
        eyebrow="Step 1 of 2"
        title="How do you measure?"
        subtitle="Pick a system and we'll set distance, elevation, pace and weight to match. Nothing else to decide."
      />

      <View>
        {SYSTEMS.map((option) => (
          <ChoiceCard
            key={option.value}
            icon={option.icon}
            title={option.label}
            subtitle={option.summary}
            chips={option.chips}
            selected={system === option.value}
            onPress={() => onChange("distanceUnit", option.value)}
          />
        ))}
      </View>

      <View
        className="flex-row items-center gap-2 mt-5 rounded-xl px-4 py-3"
        style={{ backgroundColor: colors.cardMuted }}
      >
        <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text className="flex-1 text-[13px] leading-5" style={{ color: colors.textSecondary }}>
          Want a mix? The next screen lets you override any single unit.
        </Text>
      </View>
    </SlideShell>
  )
}
