"use client"

import { ICONS } from "./icons"
import {
  Chip,
  PrimaryButton,
  SettingRow,
  SlideHeading,
  SlideShell,
  TextAction,
} from "./primitives"
import { useTheme } from "@/hooks/useTheme"
import {
  ELEVATION,
  PACE,
  SPEED,
  SYSTEM_DEFAULTS,
  SYSTEM_LABELS,
  WEIGHT,
  systemChips,
  type UnitSystem,
} from "./prefs"
import type { OnboardingPrefs } from "./prefs"

type Props = {
  prefs: OnboardingPrefs
  onChange: <K extends keyof OnboardingPrefs>(key: K, value: OnboardingPrefs[K]) => void
  onNext: () => void
}

/** The opt-in refinement pass. Everything is already filled in. */
export default function UnitsDetailSlide({ prefs, onChange, onNext }: Props) {
  const { colors } = useTheme()
  const system: UnitSystem = prefs.distanceUnit === "imperial" ? "imperial" : "metric"
  const Sparkles = ICONS["sparkles-outline"]
  const isDefault =
    prefs.elevationUnit === SYSTEM_DEFAULTS[system].elevationUnit &&
    prefs.paceUnit === SYSTEM_DEFAULTS[system].paceUnit &&
    prefs.speedUnit === SYSTEM_DEFAULTS[system].speedUnit &&
    prefs.weightUnit === SYSTEM_DEFAULTS[system].weightUnit

  function resetToSystem() {
    onChange("elevationUnit", SYSTEM_DEFAULTS[system].elevationUnit)
    onChange("paceUnit", SYSTEM_DEFAULTS[system].paceUnit)
    onChange("speedUnit", SYSTEM_DEFAULTS[system].speedUnit)
    onChange("weightUnit", SYSTEM_DEFAULTS[system].weightUnit)
  }

  return (
    <SlideShell
      footer={
        <PrimaryButton
          label={isDefault ? "Looks right" : "Save and continue"}
          icon="arrow-forward"
          onPress={onNext}
        />
      }
    >
      <SlideHeading
        icon="swap-horizontal-outline"
        eyebrow="Step 2 of 2"
        title="Fine-tune your units"
        subtitle="Already set from your choice. Change anything that doesn't suit you — or leave it all as it is."
      />

      <div
        className="mb-6 rounded-2xl border px-4 py-3.5"
        style={{ borderColor: colors.line, backgroundColor: colors.surface }}
      >
        <div className="mb-2.5 flex items-center gap-2">
          <Sparkles size={14} strokeWidth={2} className="shrink-0" style={{ color: colors.accent }} aria-hidden />
          <span className="text-[13px] font-semibold" style={{ color: colors.ink }}>
            Based on {SYSTEM_LABELS[system]}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {systemChips(prefs).map((chip) => (
            <Chip key={chip} label={chip} />
          ))}
        </div>

        {isDefault ? null : (
          <div className="-mb-1.5 mt-1">
            <TextAction
              label="Reset to system defaults"
              icon="refresh-outline"
              onPress={resetToSystem}
            />
          </div>
        )}
      </div>

      {/* `K` is pinned here: left to inference it widens to the union of every
          pref and the row would accept any unit for any field. */}
      <SettingRow<"elevationUnit">
        label={ELEVATION.label}
        icon={ELEVATION.icon}
        options={ELEVATION.options}
        value={prefs.elevationUnit}
        onChange={(v) => onChange("elevationUnit", v)}
      />
      <SettingRow<"paceUnit">
        label={PACE.label}
        icon={PACE.icon}
        options={PACE.options}
        value={prefs.paceUnit}
        onChange={(v) => onChange("paceUnit", v)}
      />
      <SettingRow<"speedUnit">
        label={SPEED.label}
        icon={SPEED.icon}
        options={SPEED.options}
        value={prefs.speedUnit}
        onChange={(v) => onChange("speedUnit", v)}
      />
      <SettingRow<"weightUnit">
        label={WEIGHT.label}
        icon={WEIGHT.icon}
        options={WEIGHT.options}
        value={prefs.weightUnit}
        onChange={(v) => onChange("weightUnit", v)}
      />
    </SlideShell>
  )
}
