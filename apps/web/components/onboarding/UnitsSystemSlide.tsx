"use client"

import { ICONS } from "./icons"
import { ChoiceCard, PrimaryButton, SlideHeading, SlideShell } from "./primitives"
import { useTheme } from "@/hooks/useTheme"
import { SYSTEMS, type UnitSystem } from "./prefs"
import type { OnboardingPrefs } from "./prefs"

type Props = {
  prefs: OnboardingPrefs
  onChange: <K extends keyof OnboardingPrefs>(key: K, value: OnboardingPrefs[K]) => void
  onNext: () => void
}

/** One decision, not five: a system choice settles all of them at once. */
export default function UnitsSystemSlide({ prefs, onChange, onNext }: Props) {
  const { colors } = useTheme()
  const system: UnitSystem = prefs.distanceUnit === "imperial" ? "imperial" : "metric"
  const Info = ICONS["information-circle-outline"]

  return (
    <SlideShell
      footer={<PrimaryButton label="Continue" icon="arrow-forward" onPress={onNext} />}
    >
      <SlideHeading
        icon="options-outline"
        eyebrow="Step 1 of 2"
        title="How do you measure?"
        subtitle="Pick a system and we'll set distance, elevation, pace and weight to match. Nothing else to decide."
      />

      <div role="radiogroup" aria-label="Measurement system">
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
      </div>

      <div
        className="mt-5 flex items-center gap-2 rounded-xl px-4 py-3"
        style={{ backgroundColor: colors.surfaceMuted }}
      >
        <Info size={16} strokeWidth={2} className="shrink-0" style={{ color: colors.inkMuted }} aria-hidden />
        <p className="flex-1 text-[13px] leading-5" style={{ color: colors.inkSecondary }}>
          Want a mix? The next screen lets you override any single unit.
        </p>
      </div>
    </SlideShell>
  )
}
