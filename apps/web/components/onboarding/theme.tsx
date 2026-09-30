"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react"

export type ThemeScheme = "system" | "light" | "dark"

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
  /**
   * Pointer-only tints. Mobile leans on `active:` for every affordance; a
   * mouse has no press-and-hold, so hover needs a colour of its own.
   */
  cardHover: string
  trackHover: string
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
  cardHover: "#FAFAFA",
  trackHover: "rgba(255, 255, 255, 0.75)",
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
  cardHover: "#16213C",
  trackHover: "rgba(51, 65, 85, 0.55)",
}

const DARK_QUERY = "(prefers-color-scheme: dark)"

/* `useSyncExternalStore` rather than a `useEffect`: the server snapshot is a
   constant, so the first client render matches the server HTML and the flow
   repaints to dark immediately after hydration instead of flashing light. */
function subscribeToSystemScheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function getSystemScheme() {
  return window.matchMedia(DARK_QUERY).matches
}

function getServerScheme() {
  return false
}

type OnboardingThemeContextValue = {
  isDark: boolean
  colors: OnboardingColors
  /** The live override driving the preview, not the value being edited. */
  scheme: ThemeScheme
  setScheme: (scheme: ThemeScheme) => void
}

const OnboardingThemeContext = createContext<OnboardingThemeContextValue | null>(null)

/**
 * Resolved colour scheme for the flow.
 *
 * Every colour is handed down as a CSS custom property on the flow root, so the
 * appearance slide can repaint the running screen the instant a theme is
 * tapped — the same promise NativeWind makes on mobile through `setColorScheme`.
 * Reading the scheme rather than hardcoding `dark:` classes is what lets the
 * preview survive a reload of the whole surface in one paint.
 */
export function OnboardingThemeProvider({
  children,
  initialScheme = "system",
}: {
  children: ReactNode
  initialScheme?: ThemeScheme
}) {
  /*
   * Seeded from the stored preference rather than hardcoded to "system": a
   * returning athlete whose theme is already dark would otherwise land on a
   * light screen with the Dark card showing as chosen — the control claiming a
   * selection the page is not actually rendering.
   */
  const [scheme, setScheme] = useState<ThemeScheme>(initialScheme)
  const systemIsDark = useSyncExternalStore(subscribeToSystemScheme, getSystemScheme, getServerScheme)

  const isDark = scheme === "dark" || (scheme === "system" && systemIsDark)
  const colors = (isDark ? DARK : LIGHT) as OnboardingColors

  const value = useMemo<OnboardingThemeContextValue>(
    () => ({ isDark, colors, scheme, setScheme }),
    [isDark, colors, scheme],
  )

  return <OnboardingThemeContext.Provider value={value}>{children}</OnboardingThemeContext.Provider>
}

export function useOnboardingTheme() {
  const context = useContext(OnboardingThemeContext)
  if (!context) {
    throw new Error("useOnboardingTheme must be used inside <OnboardingThemeProvider>")
  }
  return context
}

/** `cardMuted` → `--ob-card-muted`, so the palette is the single source. */
function toCssVarName(key: string) {
  return `--ob-${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`
}

export function onboardingVars(colors: OnboardingColors, isDark: boolean): CSSProperties {
  const vars: Record<string, string> = {}

  for (const [key, value] of Object.entries(colors)) {
    vars[toCssVarName(key)] = value
  }

  // Native widgets (scrollbars, caret, autofill) follow the flow rather than
  // the OS, so a light preview does not drag a dark scrollbar along with it.
  vars.colorScheme = isDark ? "dark" : "light"

  return vars as CSSProperties
}
