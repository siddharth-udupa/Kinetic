"use client"

import { useMemo } from "react"
import { ICONS, type IconName } from "./icons"
import {
  PrimaryButton,
  Segmented,
  SlideHeading,
  SlideShell,
  ThemePreview,
} from "./primitives"
import { useTheme } from "../theme"
import { THEME_LABELS, TIME_LABELS } from "./prefs"
import type { OnboardingPrefs } from "./prefs"

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
 * Theme and time format, with the theme applied to the running screen.
 *
 * Choosing a look is a visual decision, so tapping a card repaints the flow
 * immediately — including this one. `onChange("theme", …)` resolves through the
 * same scheme context everything else reads from, so there is no separate
 * "preview mode" to get out of sync.
 */
export default function AppearanceSlide({ prefs, onChange, onNext }: Props) {
  const { colors } = useTheme()
  const Clock = ICONS["time-outline"]

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
    <SlideShell footer={<PrimaryButton label="Continue" icon="arrow-forward" onPress={onNext} />}>
      <SlideHeading
        icon="color-palette-outline"
        title="Make it yours"
        subtitle="Pick a look and the app changes as you tap — so you can see it before you commit."
      />

      {/* Theme */}
      <h3
        className="mb-3 text-xs font-semibold tracking-widest uppercase"
        style={{ color: colors.textMuted }}
      >
        Theme
      </h3>

      <div role="radiogroup" aria-label="Theme" className="mb-7 flex gap-2.5">
        {THEMES.map((option) => {
          const selected = prefs.theme === option.value
          const Icon = ICONS[option.icon]

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={THEME_LABELS[option.value]}
              onClick={() => onChange("theme", option.value)}
              className={`min-w-0 flex-1 cursor-pointer rounded-2xl border-2 p-2.5 transition active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ob-accent) ${
                selected
                  ? "bg-(--ob-accent-soft)"
                  : "bg-(--ob-card) hover:bg-(--ob-card-hover)"
              }`}
              style={{ borderColor: selected ? colors.accent : colors.border }}
            >
              <ThemePreview scheme={option.value} />

              <span className="mt-2.5 flex items-center gap-1.5">
                <Icon
                  size={14}
                  strokeWidth={2}
                  className="shrink-0"
                  style={{ color: selected ? colors.accent : colors.textMuted }}
                  aria-hidden
                />
                <span
                  className="truncate text-[13px] font-semibold"
                  style={{ color: selected ? colors.accentText : colors.textSecondary }}
                >
                  {THEME_LABELS[option.value]}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Time format, with a live sample of the difference. */}
      <h3
        className="mb-3 text-xs font-semibold tracking-widest uppercase"
        style={{ color: colors.textMuted }}
      >
        Time format
      </h3>

      <div
        className="rounded-2xl border px-4 py-4"
        style={{ borderColor: colors.border, backgroundColor: colors.card }}
      >
        <Segmented
          value={prefs.timeFormat}
          onChange={(v) => onChange("timeFormat", v)}
          options={[
            { label: "24-hour", value: "24h" },
            { label: "12-hour", value: "12h" },
          ]}
        />

        <div
          className="mt-3 flex items-center justify-between rounded-xl px-3.5 py-3"
          style={{ backgroundColor: colors.cardMuted }}
        >
          <span className="flex items-center gap-2">
            <Clock size={15} strokeWidth={2} className="shrink-0" style={{ color: colors.textMuted }} aria-hidden />
            <span className="text-[13px]" style={{ color: colors.textSecondary }}>
              {TIME_LABELS[prefs.timeFormat]} clock
            </span>
          </span>
          {/* Rendered on the server and again on the client: the clock is
              whichever minute the visitor arrived on. */}
          <span
            className="text-[15px] font-semibold tabular-nums"
            style={{ color: colors.text }}
            suppressHydrationWarning
          >
            {formatSample(prefs.timeFormat)}
          </span>
        </div>
      </div>
    </SlideShell>
  )
}
