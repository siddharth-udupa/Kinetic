import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import type { DistanceUnit, ElevationUnit } from "@repo/units"
import { durationToSeconds } from "@repo/units"
import type { ManualActivityInput } from "@repo/validation"
import { authClient } from "@/lib/auth-client"
import { invalidateActivitiesCache } from "@/hooks/useActivities"
import { useTheme } from "@/hooks/useTheme"

// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL = process.env.EXPO_PUBLIC_API_URL!

// Lowercase values — must match the `activity_type` pgEnum. "Other" was
// removed: the database has no such value, so it could never be persisted.
const SPORTS: ManualActivityInput["type"][] = ["run", "ride", "swim", "walk", "hike"]

const DISTANCE_UNITS: DistanceUnit[] = ["metric", "imperial"]
const ELEVATION_UNITS: ElevationUnit[] = ["meters", "feet"]

// ─── Types ────────────────────────────────────────────────────────────────────

// Duration sub-shape from ManualActivityInput (the object branch of the union)
type DurationObj = Extract<ManualActivityInput["duration"], { hr: number }>

// MetaData sub-shape from ManualActivityInput
type MetaData = NonNullable<ManualActivityInput["metaData"]>

interface FormState {
  distance: string          // held as string for TextInput, parsed on submit
  duration: DurationObj
  elevationGain: string
  elevationLoss: string
  type: ManualActivityInput["type"]
  startTime: string         // "YYYY-MM-DDTHH:mm" local string
  endTime: string
  title: string
  description: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a local datetime string in "YYYY-MM-DDTHH:mm" format for the default start time. */
function getLocalDateTimeString(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/** Formats server-side Zod / API error responses into a readable string. */
function formatErrorMessage(resData: any): string {
  if (!resData) return "An unexpected error occurred while saving."

  if (resData.detailedError) {
    const errs = resData.detailedError
    if (typeof errs === "string") return errs
    if (Array.isArray(errs)) {
      return errs
        .map((e: any) => {
          const field =
            Array.isArray(e.path) && e.path.length > 0
              ? e.path
                  .map((p: any) => String(p).charAt(0).toUpperCase() + String(p).slice(1))
                  .join(" > ")
              : ""
          let msg = e.message || "Invalid value"
          if (e.code === "too_small") msg = e.minimum ? `must be at least ${e.minimum} character(s)` : "is required"
          else if (e.code === "too_big") msg = `must be at most ${e.maximum} character(s)`
          else if (e.code === "invalid_type") msg = "is invalid"
          return field ? `${field} ${msg}` : msg
        })
        .join(". ")
    }
  }

  if (resData.error) {
    return typeof resData.error === "string" ? resData.error : "Validation failed on the server."
  }

  return "Failed to save activity."
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="bg-surface shadow-sm rounded-2xl mx-4 mb-3 p-4 border border-line-muted"
    >
      {children}
    </View>
  )
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
      {label}
      {required && <Text className="text-accent"> *</Text>}
    </Text>
  )
}

function NumericInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
}) {
  const { colors } = useTheme()

  return (
    <View className="flex-row items-center bg-surface-muted-hover border border-line-strong rounded-xl px-3 h-11 flex-1">
      <TextInput
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "0"}
        placeholderTextColor={colors.inkDisabled}
        className="flex-1 text-base text-ink font-medium"
        style={{ paddingVertical: 0 }}
      />
    </View>
  )
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
  labels?: Partial<Record<T, string>>
}) {
  return (
    <View className="flex-row bg-surface-muted rounded-xl p-1 mt-1">
      {options.map((opt) => {
        const isActive = opt === value
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            className={`flex-1 py-1.5 rounded-lg items-center ${
              isActive ? "bg-raised shadow-sm" : ""
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-xs font-semibold capitalize ${
                isActive ? "text-accent" : "text-ink-muted"
              }`}
            >
              {labels?.[opt] ?? opt}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function SportSelector({
  value,
  onChange,
}: {
  value: ManualActivityInput["type"]
  onChange: (v: ManualActivityInput["type"]) => void
}) {
  const { colors } = useTheme()

  const SPORT_ICONS: Record<ManualActivityInput["type"], React.ComponentProps<typeof Ionicons>["name"]> = {
    run: "walk",
    ride: "bicycle",
    swim: "water",
    walk: "footsteps",
    hike: "trail-sign",
  }

  return (
    <View className="flex-row flex-wrap gap-2 mt-1">
      {SPORTS.map((sport) => {
        const isActive = sport === value
        return (
          <TouchableOpacity
            key={sport}
            onPress={() => onChange(sport)}
            activeOpacity={0.75}
            className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
              isActive
                ? "bg-accent border-accent"
                : "bg-surface-muted-hover border-line-strong"
            }`}
          >
            <Ionicons name={SPORT_ICONS[sport]} size={14} color={isActive ? colors.onAccent : colors.inkDisabled} />
            <Text
              className={`text-xs font-semibold ${isActive ? "text-on-accent" : "text-ink-secondary"}`}
            >
              {sport.charAt(0).toUpperCase() + sport.slice(1)}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function DurationInput({
  value,
  onChange,
}: {
  value: DurationObj
  onChange: (key: keyof DurationObj, v: number) => void
}) {
  const fields: { key: keyof DurationObj; label: string; max?: number }[] = [
    { key: "hr", label: "hr" },
    { key: "min", label: "min", max: 59 },
    { key: "sec", label: "sec", max: 59 },
  ]

  return (
    <View className="flex-row gap-2 mt-1">
      {fields.map(({ key, label, max }) => (
        <View key={key} className="flex-1 items-center">
          <View className="bg-surface-muted-hover border border-line-strong rounded-xl h-11 w-full justify-center items-center">
            <TextInput
              keyboardType="number-pad"
              value={String(value[key])}
              onChangeText={(v) => {
                const parsed = parseInt(v) || 0
                onChange(key, max !== undefined ? Math.min(parsed, max) : parsed)
              }}
              maxLength={2}
              className="text-base font-bold text-ink text-center w-full"
              style={{ paddingVertical: 0 }}
            />
          </View>
          <Text className="text-xs text-ink-disabled mt-1 font-medium">{label}</Text>
        </View>
      ))}
    </View>
  )
}

function DateTimeInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const { colors } = useTheme()

  return (
    <View className="bg-surface-muted-hover border border-line-strong rounded-xl px-3 h-11 flex-row items-center mt-1">
      <Ionicons name="calendar-outline" size={16} color={colors.inkDisabled} style={{ marginRight: 6 }} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? "YYYY-MM-DDTHH:mm"}
        placeholderTextColor={colors.inkDisabled}
        className="flex-1 text-sm text-ink"
        style={{ paddingVertical: 0 }}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ManualUploadScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()

  const [formState, setFormState] = useState<FormState>({
    distance: "",
    duration: { hr: 0, min: 30, sec: 0 },
    elevationGain: "",
    elevationLoss: "",
    type: "run",
    startTime: getLocalDateTimeString(),

    endTime: "",
    title: "",
    description: "",
  })

  const [metaData, setMetaData] = useState<MetaData>({
    distanceUnit: "metric",
    elevUnitGain: "meters",
    elevUnitLoss: "meters",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Derived validation ─────────────────────────────────────────────────────
  // Use durationToSeconds from @repo/units to validate duration > 0
  const isTitleValid = (formState.title || "").trim().length > 0
  const isDistanceValid = parseFloat(formState.distance || "0") > 0
  const isDurationValid = durationToSeconds(formState.duration) > 0
  const isFormValid = isTitleValid && isDistanceValid && isDurationValid

  // ── Update helpers ─────────────────────────────────────────────────────────

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setFormState((prev) => ({ ...prev, [key]: value }))

  const updateMeta = <K extends keyof MetaData>(key: K, value: MetaData[K]) =>
    setMetaData((prev) => ({ ...prev, [key]: value }))

  const updateDuration = (key: keyof DurationObj, value: number) =>
    setFormState((prev) => ({ ...prev, duration: { ...prev.duration, [key]: value } }))

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!isFormValid) {
      Alert.alert(
        "Missing Fields",
        "Please fill in the required fields: Title, Distance, and Duration."
      )
      return
    }

    setIsSubmitting(true)

    try {
      // Build a payload that matches ManualActivityInput exactly,
      // nested under { source: "manual", data: ... } as the web page does.
      const payload: { source: "manual"; data: ManualActivityInput } = {
        source: "manual",
        data: {
          title: (formState.title || "").trim(),
          description: (formState.description || "").trim() || undefined,
          type: formState.type,
          distance: parseFloat(formState.distance) || 0,
          duration: formState.duration,           // { hr, min, sec } — the schema accepts this shape
          elevationGain: parseFloat(formState.elevationGain) || 0,
          elevationLoss: parseFloat(formState.elevationLoss) || 0,
          startTime: formState.startTime || undefined,
          endTime: formState.endTime || undefined,
          metaData,
        },
      }

      const res = await authClient.$fetch(`${API_URL}/api/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.error) {
        Alert.alert("Error", formatErrorMessage(res.error))
        return
      }

      invalidateActivitiesCache()

      Alert.alert("Activity Saved!", "Your activity has been logged successfully.", [
        {
          text: "Go to Dashboard",
          onPress: () => router.replace("/(app)/dashboard" as any),
        },
      ])
    } catch (err: any) {
      console.error("Submit error:", err)
      Alert.alert(
        "Network Error",
        "Could not connect to the server. Please check your connection and try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Go Back ────────────────────────────────────────────────────────────────

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace("/(app)/dashboard" as any)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-page">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Header ── */}
      <View
        style={{ paddingTop: Math.max(insets.top, 40) }}
        className="bg-surface border-b border-line px-4 pb-3"
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleGoBack}
            className="w-9 h-9 rounded-full bg-surface-muted items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={colors.inkMuted} />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-base font-bold text-ink">Manual Entry</Text>
            <Text className="text-xs text-ink-disabled">Log your activity</Text>
          </View>

          {/* Spacer to balance the back button */}
          <View className="w-9" />
        </View>
      </View>

      {/* ── Scrollable Form ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 80 }}
        className="flex-1"
      >
        <View className="pt-4">

          {/* ── Section: Distance & Duration ── */}
          <Text className="px-4 pb-1.5 text-[10px] font-bold text-ink-disabled uppercase tracking-widest">
            Activity Stats
          </Text>

          <SectionCard>
            <FieldLabel label="Distance" required />
            <View className="flex-row gap-2 items-end">
              <NumericInput
                value={formState.distance}
                onChangeText={(v) => updateField("distance", v)}
                placeholder="0.00"
              />
              <View className="w-28">
                <SegmentedControl<DistanceUnit>
                  options={DISTANCE_UNITS}
                  value={metaData.distanceUnit}
                  onChange={(v) => updateMeta("distanceUnit", v)}
                  labels={{ metric: "km", imperial: "mi" }}
                />
              </View>
            </View>

            <View className="h-px bg-line-muted my-4" />

            {/* durationToSeconds from @repo/units is used for validation above */}
            <FieldLabel label="Duration" required />
            <DurationInput value={formState.duration} onChange={updateDuration} />
          </SectionCard>

          {/* ── Section: Elevation ── */}
          <Text className="px-4 pb-1.5 text-[10px] font-bold text-ink-disabled uppercase tracking-widest">
            Elevation
          </Text>

          <SectionCard>
            <View className="flex-row gap-4">
              <View className="flex-1">
                <FieldLabel label="Gain" />
                <NumericInput
                  value={formState.elevationGain}
                  onChangeText={(v) => updateField("elevationGain", v)}
                  placeholder="0"
                />
                <SegmentedControl<ElevationUnit>
                  options={ELEVATION_UNITS}
                  value={metaData.elevUnitGain}
                  onChange={(v) => updateMeta("elevUnitGain", v)}
                  labels={{ meters: "m", feet: "ft" }}
                />
              </View>
              <View className="flex-1">
                <FieldLabel label="Loss" />
                <NumericInput
                  value={formState.elevationLoss}
                  onChangeText={(v) => updateField("elevationLoss", v)}
                  placeholder="0"
                />
                <SegmentedControl<ElevationUnit>
                  options={ELEVATION_UNITS}
                  value={metaData.elevUnitLoss}
                  onChange={(v) => updateMeta("elevUnitLoss", v)}
                  labels={{ meters: "m", feet: "ft" }}
                />
              </View>
            </View>
          </SectionCard>

          {/* ── Section: Sport Type ── */}
          <Text className="px-4 pb-1.5 text-[10px] font-bold text-ink-disabled uppercase tracking-widest">
            Sport
          </Text>

          <SectionCard>
            <FieldLabel label="Activity Type" />
            <SportSelector value={formState.type} onChange={(v) => updateField("type", v)} />
          </SectionCard>

          {/* ── Section: Timing ── */}
          <Text className="px-4 pb-1.5 text-[10px] font-bold text-ink-disabled uppercase tracking-widest">
            Timing
          </Text>

          <SectionCard>
            <FieldLabel label="Start Time" />
            <DateTimeInput
              value={formState.startTime}
              onChange={(v) => updateField("startTime", v)}
              placeholder="YYYY-MM-DDTHH:mm"
            />

            <View className="h-px bg-line-muted my-4" />

            <FieldLabel label="End Time" />
            <DateTimeInput
              value={formState.endTime}
              onChange={(v) => updateField("endTime", v)}
              placeholder="YYYY-MM-DDTHH:mm (optional)"
            />
          </SectionCard>

          {/* ── Section: Details ── */}
          <Text className="px-4 pb-1.5 text-[10px] font-bold text-ink-disabled uppercase tracking-widest">
            Details
          </Text>

          <SectionCard>
            <FieldLabel label="Title" required />
            <View className="bg-surface-muted-hover border border-line-strong rounded-xl px-3 h-11 flex-row items-center">
              <TextInput
                value={formState.title}
                onChangeText={(v) => updateField("title", v)}
                placeholder="e.g. Morning Run"
                placeholderTextColor={colors.inkDisabled}
                className="flex-1 text-base text-ink"
                style={{ paddingVertical: 0 }}
                maxLength={100}
              />
            </View>

            <View className="h-px bg-line-muted my-4" />

            <FieldLabel label="Description" />
            <View className="bg-surface-muted-hover border border-line-strong rounded-xl px-3 py-2.5">
              <TextInput
                value={formState.description}
                onChangeText={(v) => updateField("description", v)}
                placeholder="How'd it go? Share more about your activity..."
                placeholderTextColor={colors.inkDisabled}
                className="text-sm text-ink"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ minHeight: 90 }}
                maxLength={500}
              />
            </View>
            {(formState.description || "").length > 400 && (
              <Text className="text-right text-xs text-ink-disabled mt-1">
                {(formState.description || "").length}/500
              </Text>
            )}
          </SectionCard>

        </View>
      </ScrollView>

      {/* ── Sticky Submit Button ── */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        className="absolute bottom-0 left-0 right-0 bg-surface border-t border-line px-4 pt-3"
      >
        {!isFormValid && (
          <Text className="text-xs text-ink-disabled text-center mb-2 italic">
            Title, distance, and duration are required.
          </Text>
        )}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          activeOpacity={0.85}
          style={
            isFormValid && !isSubmitting
              ? {
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }
              : undefined
          }
          className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
            isFormValid && !isSubmitting
              ? "bg-accent"
              : "bg-disabled"
          }`}
        >
          {isSubmitting ? (
            <>
              <ActivityIndicator size="small" color={colors.onAccent} />
              <Text className="text-on-accent font-bold text-sm">Saving...</Text>
            </>
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={isFormValid ? colors.onAccent : colors.inkDisabled}
              />
              <Text
                className={`font-bold text-sm ${
                  isFormValid ? "text-on-accent" : "text-ink-disabled"
                }`}
              >
                Save Activity
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}
