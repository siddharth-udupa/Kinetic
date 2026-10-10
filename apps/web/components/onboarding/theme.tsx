"use client"

import { type ColorTokens, colorsToCssVars, getColors, type ThemeScheme } from "@repo/shared"
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react"

/**
 * The palette itself lives in `@repo/shared` — this module only owns the React
 * plumbing for reading it.
 *
 * Keeping the values out of here is the whole point: the mobile app resolves the
 * same tokens through `src/components/ui/onboarding/theme.ts`, so a colour
 * changed in `packages/shared/src/colors.ts` moves on both platforms at once.
 * Do not add a colour here.
 */

/** @deprecated Re-exported from `@repo/shared`. Import it from there instead. */
export type OnboardingColors = ColorTokens

/** @deprecated Re-exported from `@repo/shared`. Import it from there instead. */
export type { ThemeScheme }

const DARK_QUERY = "(prefers-color-scheme: dark)"

/* `useSyncExternalStore` reads the snapshot during render, so the first client paint
   agrees with the server HTML instead of correcting a frame later. */
function subscribeToSystemScheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function getSystemScheme() {
  return window.matchMedia(DARK_QUERY).matches
}

/**
 * What the server rendered with, as a boolean `isDark`.
 *
 * Always false: the server cannot know the athlete's scheme on a first visit, so light
 * is the only answer it can give. `useSyncExternalStore` keeps the first client render
 * on this value and only then reads the real preference, which is what keeps hydration
 * free of mismatches. Once the cookie in `theme-init` exists the server renders the
 * right scheme itself, and this is bypassed entirely.
 */
function getServerScheme() {
  return false
}

type OnboardingThemeContextValue = {
  isDark: boolean
  colors: ColorTokens
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
  const colors = getColors(isDark ? "dark" : "light")

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

/**
 * The resolved palette as CSS custom properties, ready for a `style` prop.
 *
 * Thin wrapper over `colorsToCssVars` in `@repo/shared` so existing call sites
 * keep working; the naming convention itself is shared, since both apps have to
 * agree on it.
 */
export function onboardingVars(colors: ColorTokens, isDark: boolean): CSSProperties {
  return colorsToCssVars(colors, isDark) as CSSProperties
}
