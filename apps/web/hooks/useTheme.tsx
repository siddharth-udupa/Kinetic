"use client"

import { colorsToCssVars, getColors, type ThemeScheme } from "@repo/shared"
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
 * The app-wide theme: which scheme is active, and the palette it resolves to.
 *
 * The values themselves live in `@repo/shared` — this module owns only the React
 * plumbing. Mobile resolves the same tokens through `src/hooks/useTheme.ts`, so a
 * colour changed in `packages/shared/src/colors.ts` moves on both platforms at once.
 * Do not add a colour here.
 *
 * Colours reach the DOM as `--ob-*` custom properties on a wrapper rather than as
 * `dark:` classes, which is what lets the onboarding appearance slide repaint the
 * running screen the instant a theme is tapped.
 */

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
 * What the server rendered with, as `isDark`.
 *
 * Always false: the server cannot know the athlete's scheme on a first visit. Holding the
 * first client render on this value is what keeps hydration mismatch-free — once the
 * `ob-theme` cookie exists the server renders the right scheme itself and this is bypassed.
 */
function getServerScheme() {
  return false
}

type ThemeContextValue = {
  isDark: boolean
  colors: ReturnType<typeof getColors>
  /** The live override driving the preview, not the value being edited. */
  scheme: ThemeScheme
  setScheme: (scheme: ThemeScheme) => void
  /** The same palette as `--ob-*` custom properties, for a `style` prop. */
  vars: CSSProperties
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  children,
  initialScheme = "system",
}: {
  children: ReactNode
  initialScheme?: ThemeScheme
}) {
  /*
   * Seeded from the stored preference rather than hardcoded to "system": a returning athlete
   * whose theme is already dark would otherwise land on a light screen with the Dark card
   * showing as chosen — the control claiming a selection the page is not rendering.
   */
  const [scheme, setScheme] = useState<ThemeScheme>(initialScheme)
  const systemIsDark = useSyncExternalStore(subscribeToSystemScheme, getSystemScheme, getServerScheme)

  const isDark = scheme === "dark" || (scheme === "system" && systemIsDark)
  const colors = getColors(isDark ? "dark" : "light")

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      colors,
      scheme,
      setScheme,
      vars: colorsToCssVars(colors, isDark) as CSSProperties,
    }),
    [isDark, colors, scheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>")
  }
  return context
}