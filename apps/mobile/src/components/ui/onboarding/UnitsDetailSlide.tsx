import { Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  Chip,
  PrimaryButton,
  SettingRow,
  SlideHeading,
  SlideShell,
  TextAction,
} from "./primitives"
import { useTheme } from "../theme"
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
import type { OnboardingPrefs } from "@/hooks/useOnboarding"

type Props = {
  prefs: OnboardingPrefs
  onChange: <K extends keyof OnboardingPrefs>(key: K, value: OnboardingPrefs[K]) => void
  onNext: () => void
}

/**
 * The opt-in refinement pass.
 *
 * Everything is already filled in from the previous screen, so this is a slide
 * you can walk straight past. Each unit is a small labelled control rather than
 * another full-width block, which is what made the original screen unreadable.
 */
export default function UnitsDetailSlide({ prefs, onChange, onNext }: Props) {
  const { colors } = useTheme()
  const system: UnitSystem = prefs.distanceUnit === "imperial" ? "imperial" : "metric"
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

      {/* What the previous decision produced. */}
      <View
        className="rounded-2xl border px-4 py-3.5 mb-6"
        style={{ borderColor: colors.border, backgroundColor: colors.card }}
      >
        <View className="flex-row items-center gap-2 mb-2.5">
          <Ionicons name="sparkles-outline" size={14} color={colors.accent} />
          <Text className="text-[13px] font-semibold" style={{ color: colors.text }}>
            Based on {SYSTEM_LABELS[system]}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-1.5">
          {systemChips(prefs).map((chip) => (
            <Chip key={chip} label={chip} />
          ))}
        </View>

        {isDefault ? null : (
          <View className="mt-1 -mb-1.5">
            <TextAction
              label="Reset to system defaults"
              icon="refresh-outline"
              onPress={resetToSystem}
            />
          </View>
        )}
      </View>

      {/* `K` is pinned at each call site: left to inference it widens to the
          union of every pref, and the row would accept any unit for any field. */}
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
