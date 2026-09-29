import { useColorScheme } from "nativewind"

export type OnboardingColors = {
  page: string
  card: string
  cardMuted: string
  /** Surface that sits *above* a muted track, so it flips direction per theme. */
  raised: string
  raisedBorder: string
  border: string
  borderStrong: string
  text: string
  textSecondary: string
  textMuted: string
  accent: string
  accentSoft: string
  onAccent: string
  danger: string
  dangerSoft: string
  success: string
}

const LIGHT: OnboardingColors = {
  page: "#F9FAFB",
  card: "#FFFFFF",
  cardMuted: "#F3F4F6",
  // Lighter than the track, so the chosen segment reads as lifted off it.
  raised: "#FFFFFF",
  raisedBorder: "#E5E7EB",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  text: "#111827",
  // 7.0:1 and 4.8:1 on white. The previous pair (gray-500 / gray-400) put the
  // muted tier at 2.5:1, which is below the 4.5:1 readable minimum — helper
  // text, step counters and placeholders all washed out in light mode.
  textSecondary: "#4B5563",
  textMuted: "#6B7280",
  accent: "#FC4C02",
  accentSoft: "rgba(252, 76, 2, 0.07)",
  onAccent: "#FFFFFF",
  danger: "#DC2626",
  dangerSoft: "rgba(220, 38, 38, 0.08)",
  success: "#16A34A",
}

const DARK: OnboardingColors = {
  page: "#020617",
  card: "#0F172A",
  cardMuted: "#1E293B",
  // Elevation inverts in the dark: the chosen segment has to be *lighter*
  // than its track, otherwise the "raised" pill reads as pressed in.
  raised: "#334155",
  raisedBorder: "#475569",
  border: "#1E293B",
  borderStrong: "#334155",
  text: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  accent: "#FC4C02",
  accentSoft: "rgba(252, 76, 2, 0.16)",
  onAccent: "#FFFFFF",
  danger: "#F87171",
  dangerSoft: "rgba(248, 113, 113, 0.12)",
  success: "#22C55E",
}

/**
 * Resolved colour scheme for the flow.
 *
 * Tailwind classes cover surfaces and type, but anything handed to a native
 * component (Ionicons, Reanimated styles) needs a literal colour, so both
 * themes live here and the resolved scheme picks one. Reading the scheme rather
 * than hardcoding `dark:` classes is what lets the appearance slide preview a
 * theme live — the whole screen follows the override, icons included.
 */
export function useOnboardingTheme() {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === "dark"
  return { isDark, colors: (isDark ? DARK : LIGHT) as OnboardingColors }
}
