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
  /** Accent for *text*. Clears AA where a fill only has to clear 3:1. */
  accentText: string
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
  /**
   * Accent as *text*, which has to clear 4.5:1 rather than the 3:1 that a
   * filled shape needs. The brand orange is only 3.4:1 on white, so the pure
   * brand value is kept for fills and this deeper tint carries the words —
   * the selected segment label, eyebrows, links.
   */
  accentText: "#C2410C",
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
  // 5.2:1 on the page and 4.6:1 on a card. The previous slate-500 sat at 4.2:1
  // and 3.8:1, so helper text under WCAG AA on the dark surfaces it is used
  // on — and 3.8:1 fails outright on a card.
  textMuted: "#748399",
  accent: "#FC4C02",
  /**
   * Accent as text. On the dark theme the brand orange drops to 3.0:1 against
   * the raised pill, so words lifted a step to clear AA; fills stay #FC4C02.
   */
  accentText: "#FF9A6E",
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
