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
import type { LocationStatus, UserLocation } from "@/hooks/useUserLocation"

type IconName = ComponentProps<typeof Ionicons>["name"]

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? ""

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

function locationNotice(status: LocationStatus): {
  hint: string
  warning?: string
} {
  const settings = Platform.OS === "web" ? "browser settings" : "device settings"

  switch (status) {
    case "requesting":
      return { hint: "Getting a precise fix…" }
    case "denied":
      return {
        hint: "Location access is blocked.",
        warning: `Allow location access in your ${settings}, then retry. A loop must start from your exact position.`,
      }
    case "timeout":
      return {
        hint: "Your location is taking too long.",
        warning:
          "No precise fix arrived in time. Check your signal and retry before building a loop.",
      }
    case "unavailable":
      return {
        hint: "Your location is unavailable.",
        warning:
          "Turn on location services, then retry. A loop must start from your exact position.",
      }
    case "unsupported":
      return {
        hint: "This device cannot share your location.",
        warning:
          "Location support is required to build a loop. Try a device that can share your position.",
      }
    case "granted":
      return { hint: "Reading your position…" }
    case "idle":
      return {
        hint: "Location access is needed to choose the start point.",
      }
  }
}

export type RoutePlannerSheetProps = {
  visible: boolean
  onClose: () => void
  /** The precise fix the device returned, or null until it has one. */
  userLocation: UserLocation | null
  locationStatus: LocationStatus
  /** Prompts for permission, or retries after a refusal. */
  onRequestLocation: () => Promise<UserLocation | null>
  /** The new loop, or null while a request is in flight. */
  onRouteChange?: (route: LoopResponse | null) => void
}

export default function RoutePlannerSheet({
  visible,
  onClose,
  userLocation,
  locationStatus,
  onRequestLocation,
  onRouteChange,
}: RoutePlannerSheetProps) {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()

  const [distanceKm, setDistanceKm] = useState(10)
  const [profile, setProfile] = useState<RouteProfile>("bike")
  const [seed, setSeed] = useState("")

  const [status, setStatus] = useState<
    "idle" | "locating" | "loading" | "success" | "error"
  >("idle")
  const [result, setResult] = useState<LoopResponse | null>(null)
  const [error, setError] = useState<{
    message: string
    needsLocation?: boolean
  } | null>(null)

  const notice = locationNotice(locationStatus)

  function randomizeSeed() {
    setSeed(String(Math.floor(Math.random() * (MAX_SEED + 1))))
  }

  async function handleGenerate() {
    if (status === "loading" || status === "locating") return

    const trimmedSeed = seed.trim()
    const seedValue = trimmedSeed === "" ? undefined : Number(trimmedSeed)

    if (
      seedValue !== undefined &&
      (!Number.isInteger(seedValue) || seedValue < 0 || seedValue > MAX_SEED)
    ) {
      setStatus("error")
      setResult(null)
      onRouteChange?.(null)
      setError({
        message: `Seed must be a whole number between 0 and ${MAX_SEED.toLocaleString()}.`,
      })
      return
    }

    /* The loop is anchored to the athlete, so a request without a fix waits
       for the permission prompt instead of falling back to a fixed city. */
    let origin = userLocation

    if (!origin) {
      setStatus("locating")
      setError(null)
      origin = await onRequestLocation()

      if (!origin) {
        setStatus("error")
        setResult(null)
        onRouteChange?.(null)
        setError({
          message:
            "Location access is required to build a loop. Allow the app to use your precise location, then try again.",
          needsLocation: true,
        })
        return
      }
    }

    const payload: LoopRequest = {
      origin: { lat: origin.latitude, lon: origin.longitude },
      distanceMeters: distanceKm * 1_000,
      profile,
      ...(seedValue === undefined ? {} : { seed: seedValue }),
    }

    setStatus("loading")
    setResult(null)
    setError(null)
    onRouteChange?.(null)

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
        setError({ message: readError(res.error) })
        return
      }

      if (!res.data) {
        setStatus("error")
        setError({ message: "The route engine returned an empty response." })
        return
      }

      setResult(res.data)
      setStatus("success")
      onRouteChange?.(res.data)
    } catch (err) {
      setStatus("error")
      setError({ message: readError(err) })
    }
  }

  /** A retry after a refusal should clear the stale location error, not stack
   *  another one on top of it. Other errors belong to their own attempt. */
  async function retryLocation() {
    if (error?.needsLocation) {
      setError(null)
      setStatus("idle")
    }
    await onRequestLocation()
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
                  Pick a distance and an activity. The loop starts and finishes
                  at your current location.
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
              <View className="rounded-xl border border-line bg-surface-muted px-3 py-2.5">
                <View className="flex-row items-center gap-2.5">
                  <View className="size-8 shrink-0 items-center justify-center rounded-lg bg-surface">
                    <Ionicons name="location" size={15} color={colors.accentText} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[12px] font-semibold text-ink">
                      {userLocation
                        ? "Starting at your precise location"
                        : "Start point needs location"}
                    </Text>
                    <Text
                      className="text-[11px] text-ink-muted"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {userLocation
                        ? `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}${
                            userLocation.accuracy !== null
                              ? ` · ±${Math.round(userLocation.accuracy)} m`
                              : ""
                          }`
                        : notice.hint}
                    </Text>
                  </View>
                  {!userLocation && locationStatus !== "requesting" ? (
                    <Pressable
                      onPress={() => void retryLocation()}
                      accessibilityRole="button"
                      accessibilityLabel="Allow location access"
                      className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 active:opacity-80"
                    >
                      <Text className="text-[11px] font-semibold text-accent-text">
                        {locationStatus === "denied" ? "Retry" : "Allow"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {notice.warning ? (
                  <View
                    accessibilityRole="alert"
                    className="mt-2 flex-row items-start gap-1.5 rounded-lg border border-warning/30 bg-warning-soft px-2.5 py-2"
                  >
                    <Ionicons
                      name="warning-outline"
                      size={13}
                      color={colors.warning}
                      style={{ marginTop: 1 }}
                    />
                    <Text className="flex-1 text-[11px] leading-4 text-warning-text">
                      {notice.warning}
                    </Text>
                  </View>
                ) : null}
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
                disabled={status === "loading" || status === "locating"}
                accessibilityRole="button"
                accessibilityLabel="Generate loop"
                accessibilityState={{
                  disabled: status === "loading" || status === "locating",
                  busy: status === "loading" || status === "locating",
                }}
                className={`mt-5 h-12 flex-row items-center justify-center gap-2 rounded-xl bg-accent active:bg-accent-hover ${
                  status === "loading" || status === "locating" ? "opacity-60" : ""
                }`}
              >
                {status === "loading" || status === "locating" ? (
                  <ActivityIndicator size="small" color={colors.onAccent} />
                ) : (
                  <Ionicons name="sparkles" size={17} color={colors.onAccent} />
                )}
                <Text className="text-[14px] font-semibold text-on-accent">
                  {status === "locating"
                    ? "Finding your location…"
                    : status === "loading"
                      ? "Building your loop…"
                      : "Generate loop"}
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
                    {(result.accuracy * 100).toFixed(1)}% from target.
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

                  <Pressable
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Show loop on the map"
                    className="mt-3 h-9 flex-row items-center justify-center gap-1.5 rounded-lg border border-success/40 bg-surface active:opacity-70"
                  >
                    <Ionicons
                      name="map-outline"
                      size={14}
                      color={colors.successText}
                    />
                    <Text className="text-[12px] font-semibold text-success-text">
                      Show on map
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {status === "error" && error ? (
                <View className="mt-3 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3">
                  <View className="flex-row items-start gap-2">
                    <Ionicons
                      name={error.needsLocation ? "location-outline" : "alert-circle"}
                      size={15}
                      color={colors.danger}
                      style={{ marginTop: 2 }}
                    />
                    <View className="min-w-0 flex-1">
                      <Text className="text-[12px] font-semibold text-danger-text">
                        {error.needsLocation
                          ? "Location required"
                          : "Could not build the loop"}
                      </Text>
                      <Text className="mt-0.5 text-[11px] leading-4 text-ink-secondary">
                        {error.message}
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
                  name="map-outline"
                  size={13}
                  color={colors.inkMuted}
                  style={{ marginTop: 1 }}
                />
                <Text className="flex-1 text-[11px] leading-4 text-ink-muted">
                  Nothing is saved yet. The generated loop is drawn on the map as
                  a preview.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
