import { useState, type ComponentProps } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { LoopRequest, LoopResponse, RouteProfile } from "@repo/validation"
import { authClient } from "@/lib/auth-client"
import { useTheme } from "@/hooks/useTheme"

type IconName = ComponentProps<typeof Ionicons>["name"]

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? ""

/** The first version always starts at MG Road. Start-point picking is next. */
const ORIGIN = { lat: 12.9716, lon: 77.5946 }
const ORIGIN_LABEL = "MG Road, Bengaluru"

const MIN_DISTANCE_KM = 2
const MAX_DISTANCE_KM = 50
const DISTANCE_PRESETS = [5, 10, 20, 30, 50]
const MAX_SEED = 4_294_967_295

const PROFILE_OPTIONS: {
  value: RouteProfile
  label: string
  hint: string
  icon: IconName
}[] = [
  { value: "bike", label: "Bike", hint: "Road or hybrid", icon: "bicycle" },
  { value: "foot", label: "Walk", hint: "On foot", icon: "walk" },
]

const UNAVAILABLE_PREFERENCES: {
  label: string
  icon: IconName
  options: string[]
}[] = [
  { label: "Hills", icon: "trending-up", options: ["Flat", "Rolling", "Hilly"] },
  { label: "Surface", icon: "layers", options: ["Paved", "Mixed", "Gravel"] },
  { label: "Roads", icon: "options", options: ["Quiet", "Balanced", "Busy"] },
  { label: "Loop shape", icon: "repeat", options: ["Rounder", "Direct"] },
  { label: "Scenery", icon: "leaf", options: ["Parks", "Water", "Open"] },
  { label: "Avoid areas", icon: "ban", options: ["Draw a zone"] },
]

function formatDistance(meters: number): string {
  return `${(meters / 1_000).toFixed(1)} km`
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3_600)
  const minutes = Math.round((seconds % 3_600) / 60)

  if (hours === 0) return `${minutes} min`
  return `${hours} h ${minutes} min`
}

function clampDistance(value: number): number {
  return Math.max(MIN_DISTANCE_KM, Math.min(MAX_DISTANCE_KM, value))
}

function readError(error: unknown): string {
  if (typeof error === "string") return error

  if (error && typeof error === "object") {
    const value = error as { error?: unknown; status?: unknown }

    if (typeof value.error === "string") return value.error
    if (value.status === 401) return "Your session expired. Sign in again."
  }

  return "Could not reach the route engine. Check that it is running, then try again."
}

export type RoutePlannerSheetProps = {
  visible: boolean
  onClose: () => void
}

export default function RoutePlannerSheet({
  visible,
  onClose,
}: RoutePlannerSheetProps) {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()

  const [distanceKm, setDistanceKm] = useState(10)
  const [profile, setProfile] = useState<RouteProfile>("bike")
  const [seed, setSeed] = useState("")

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const [result, setResult] = useState<LoopResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  function randomizeSeed() {
    setSeed(String(Math.floor(Math.random() * (MAX_SEED + 1))))
  }

  async function handleGenerate() {
    if (status === "loading") return

    const trimmedSeed = seed.trim()
    const seedValue = trimmedSeed === "" ? undefined : Number(trimmedSeed)

    if (
      seedValue !== undefined &&
      (!Number.isInteger(seedValue) || seedValue < 0 || seedValue > MAX_SEED)
    ) {
      setStatus("error")
      setResult(null)
      setError(
        `Seed must be a whole number between 0 and ${MAX_SEED.toLocaleString()}.`,
      )
      return
    }

    const payload: LoopRequest = {
      origin: ORIGIN,
      distanceMeters: distanceKm * 1_000,
      profile,
      ...(seedValue === undefined ? {} : { seed: seedValue }),
    }

    setStatus("loading")
    setResult(null)
    setError(null)

    try {
      // The web BFF owns auth, validation and the route-engine URL. The app
      // never talks to the engine directly.
      const res = await authClient.$fetch<LoopResponse>(
        `${API_URL}/api/routes/loop`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )

      if (res.error) {
        setStatus("error")
        setError(readError(res.error))
        return
      }

      if (!res.data) {
        setStatus("error")
        setError("The route engine returned an empty response.")
        return
      }

      setResult(res.data)
      setStatus("success")
      console.log("[route] generated loop", res.data)
    } catch (err) {
      setStatus("error")
      setError(readError(err))
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 justify-end bg-overlay">
          <View className="max-h-[92%] overflow-hidden rounded-t-3xl border-t border-line bg-surface">
            <View className="items-center pt-2">
              <View className="h-1 w-10 rounded-full bg-line-strong" />
            </View>

            <View className="flex-row items-start justify-between px-5 pt-3">
              <View className="flex-1 pr-3">
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-accent-text">
                  Route builder
                </Text>
                <Text className="mt-1 text-[22px] font-bold text-ink">
                  Plan a loop
                </Text>
                <Text className="mt-1.5 text-[12px] leading-5 text-ink-secondary">
                  Pick a distance and an activity. The engine finds a route that
                  starts and finishes at the same point.
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close route builder"
                hitSlop={8}
                className="size-9 items-center justify-center rounded-full bg-surface-muted active:opacity-70"
              >
                <Ionicons name="close" size={19} color={colors.inkMuted} />
              </Pressable>
            </View>

            <ScrollView
              className="mt-4"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: Math.max(insets.bottom, 18) + 8,
              }}
            >
              <View className="flex-row items-center gap-2.5 rounded-xl border border-line bg-surface-muted px-3 py-2.5">
                <View className="size-8 shrink-0 items-center justify-center rounded-lg bg-surface">
                  <Ionicons name="location" size={15} color={colors.accentText} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[12px] font-semibold text-ink">
                    {ORIGIN_LABEL}
                  </Text>
                  <Text className="text-[11px] text-ink-muted">
                    Fixed start for this first version
                  </Text>
                </View>
              </View>

              <View className="mt-5">
                <View className="mb-2 flex-row items-baseline justify-between gap-3">
                  <Text className="text-[12px] font-semibold text-ink-secondary">
                    Distance
                  </Text>
                  <Text className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    Target
                  </Text>
                </View>

                <View className="flex-row items-center justify-between gap-3">
                  <Pressable
                    onPress={() => setDistanceKm((value) => clampDistance(value - 1))}
                    disabled={distanceKm <= MIN_DISTANCE_KM}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease distance"
                    accessibilityState={{ disabled: distanceKm <= MIN_DISTANCE_KM }}
                    className={`size-10 items-center justify-center rounded-full border border-line bg-surface-muted active:opacity-70 ${
                      distanceKm <= MIN_DISTANCE_KM ? "opacity-40" : ""
                    }`}
                  >
                    <Ionicons name="remove" size={18} color={colors.inkSecondary} />
                  </Pressable>

                  <View className="flex-1 items-center">
                    <Text
                      className="text-[30px] leading-none font-bold text-ink"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {distanceKm}
                      <Text className="text-[14px] font-semibold text-ink-muted">
                        {" "}
                        km
                      </Text>
                    </Text>
                    <Text className="mt-1 text-[11px] text-ink-muted">
                      {profile === "bike" ? "Bike loop" : "Walking loop"}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setDistanceKm((value) => clampDistance(value + 1))}
                    disabled={distanceKm >= MAX_DISTANCE_KM}
                    accessibilityRole="button"
                    accessibilityLabel="Increase distance"
                    accessibilityState={{ disabled: distanceKm >= MAX_DISTANCE_KM }}
                    className={`size-10 items-center justify-center rounded-full border border-line bg-surface-muted active:opacity-70 ${
                      distanceKm >= MAX_DISTANCE_KM ? "opacity-40" : ""
                    }`}
                  >
                    <Ionicons name="add" size={18} color={colors.inkSecondary} />
                  </Pressable>
                </View>

                <View className="mt-3 flex-row gap-1.5">
                  {DISTANCE_PRESETS.map((preset) => {
                    const selected = distanceKm === preset

                    return (
                      <Pressable
                        key={preset}
                        onPress={() => setDistanceKm(preset)}
                        accessibilityRole="button"
                        accessibilityLabel={`Set distance to ${preset} kilometres`}
                        accessibilityState={{ selected }}
                        className={`flex-1 items-center rounded-lg border py-1.5 active:opacity-70 ${
                          selected
                            ? "border-accent bg-accent-soft"
                            : "border-line bg-surface"
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-semibold ${
                            selected ? "text-accent-text" : "text-ink-muted"
                          }`}
                        >
                          {preset}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>

                <View className="mt-1 flex-row justify-between">
                  <Text className="text-[10px] text-ink-disabled">
                    {MIN_DISTANCE_KM} km
                  </Text>
                  <Text className="text-[10px] text-ink-disabled">
                    {MAX_DISTANCE_KM} km
                  </Text>
                </View>
              </View>

              <View className="mt-5">
                <Text className="mb-2 text-[12px] font-semibold text-ink-secondary">
                  Activity
                </Text>

                <View className="flex-row gap-2">
                  {PROFILE_OPTIONS.map((option) => {
                    const selected = profile === option.value

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setProfile(option.value)}
                        accessibilityRole="radio"
                        accessibilityLabel={option.label}
                        accessibilityState={{ selected }}
                        className={`flex-1 items-start gap-2 rounded-xl border p-3 active:opacity-80 ${
                          selected
                            ? "border-accent bg-accent-soft"
                            : "border-line bg-surface"
                        }`}
                      >
                        <Ionicons
                          name={option.icon}
                          size={18}
                          color={selected ? colors.accentText : colors.inkMuted}
                        />
                        <View>
                          <Text
                            className={`text-[13px] font-semibold ${
                              selected ? "text-accent-text" : "text-ink"
                            }`}
                          >
                            {option.label}
                          </Text>
                          <Text className="mt-0.5 text-[11px] text-ink-muted">
                            {option.hint}
                          </Text>
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              <View className="mt-5">
                <Text className="text-[12px] font-semibold text-ink-secondary">
                  Seed{" "}
                  <Text className="font-normal text-ink-muted">(optional)</Text>
                </Text>

                <View className="mt-2 flex-row gap-2">
                  <TextInput
                    value={seed}
                    onChangeText={setSeed}
                    keyboardType="number-pad"
                    placeholder="Auto"
                    placeholderTextColor={colors.inkMuted}
                    accessibilityLabel="Route seed"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[13px] text-ink"
                    style={{ paddingVertical: 0 }}
                  />
                  <Pressable
                    onPress={randomizeSeed}
                    accessibilityRole="button"
                    accessibilityLabel="Generate a random seed"
                    className="size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface active:opacity-70"
                  >
                    <Ionicons name="dice-outline" size={18} color={colors.inkSecondary} />
                  </Pressable>
                </View>

                <Text className="mt-1.5 text-[11px] leading-4 text-ink-muted">
                  Same seed and preferences rebuild the same loop.
                </Text>
              </View>

              <Pressable
                onPress={handleGenerate}
                disabled={status === "loading"}
                accessibilityRole="button"
                accessibilityLabel="Generate loop"
                accessibilityState={{
                  disabled: status === "loading",
                  busy: status === "loading",
                }}
                className={`mt-5 h-12 flex-row items-center justify-center gap-2 rounded-xl bg-accent active:bg-accent-hover ${
                  status === "loading" ? "opacity-60" : ""
                }`}
              >
                {status === "loading" ? (
                  <ActivityIndicator size="small" color={colors.onAccent} />
                ) : (
                  <Ionicons name="sparkles" size={17} color={colors.onAccent} />
                )}
                <Text className="text-[14px] font-semibold text-on-accent">
                  {status === "loading" ? "Building your loop…" : "Generate loop"}
                </Text>
              </Pressable>

              {status === "success" && result ? (
                <View className="mt-3 rounded-xl border border-success/30 bg-success-soft px-3.5 py-3">
                  <View className="flex-row items-center gap-2">
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={colors.success}
                    />
                    <Text className="text-[12px] font-semibold text-success-text">
                      Loop generated
                    </Text>
                  </View>

                  <Text className="mt-1.5 text-[12px] text-ink-secondary">
                    {formatDistance(result.distanceMeters)} ·{" "}
                    {formatDuration(result.durationSeconds)} ·{" "}
                    {result.elevationGainMeters} m climb
                  </Text>
                  <Text className="mt-1 text-[11px] leading-4 text-ink-muted">
                    Seed {result.seed} ·{" "}
                    {(result.accuracy * 100).toFixed(1)}% from target. Full route
                    logged to the server console.
                  </Text>

                  {result.warnings.length > 0 ? (
                    <View className="mt-2 gap-1">
                      {result.warnings.map((warning) => (
                        <Text
                          key={warning}
                          className="text-[11px] leading-4 text-warning-text"
                        >
                          {warning}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {status === "error" && error ? (
                <View className="mt-3 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3">
                  <View className="flex-row items-start gap-2">
                    <Ionicons
                      name="alert-circle"
                      size={15}
                      color={colors.danger}
                      style={{ marginTop: 2 }}
                    />
                    <View className="min-w-0 flex-1">
                      <Text className="text-[12px] font-semibold text-danger-text">
                        Could not build the loop
                      </Text>
                      <Text className="mt-0.5 text-[11px] leading-4 text-ink-secondary">
                        {error}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

              <View className="mt-6">
                <View className="mb-2 flex-row items-center justify-between gap-2">
                  <Text className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                    Not available yet
                  </Text>
                  <View className="rounded-full border border-line bg-surface-muted px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-ink-disabled">
                      Soon
                    </Text>
                  </View>
                </View>

                <View className="gap-1.5">
                  {UNAVAILABLE_PREFERENCES.map((preference) => (
                    <View
                      key={preference.label}
                      className="rounded-xl border border-line-muted bg-surface/60 p-2.5"
                    >
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons
                          name={preference.icon}
                          size={12}
                          color={colors.inkDisabled}
                        />
                        <Text className="text-[11px] font-semibold text-ink-secondary">
                          {preference.label}
                        </Text>
                      </View>

                      <View className="mt-1.5 flex-row gap-1">
                        {preference.options.map((option) => (
                          <View
                            key={option}
                            className="flex-1 items-center rounded-md border border-line-muted px-1 py-1"
                          >
                            <Text className="text-[10px] font-semibold text-ink-disabled">
                              {option}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>

                <View className="mt-1.5 flex-row items-center gap-2 rounded-xl border border-line-muted bg-surface/60 px-2.5 py-2">
                  <Ionicons
                    name="boat-outline"
                    size={12}
                    color={colors.successText}
                  />
                  <Text className="text-[11px] font-semibold text-ink-secondary">
                    Ferry crossings
                  </Text>
                  <Text className="ml-auto text-[10px] font-semibold text-success-text">
                    Always avoided
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row items-start gap-2 border-t border-line pt-3">
                <Ionicons
                  name="terminal-outline"
                  size={13}
                  color={colors.inkMuted}
                  style={{ marginTop: 1 }}
                />
                <Text className="flex-1 text-[11px] leading-4 text-ink-muted">
                  Nothing is saved yet. The generated route is logged to the
                  Next.js server console; the map preview comes next.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
