"use client"

import { type ColorTokens, getColors, type ThemeScheme } from "@repo/shared"
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react"

// Colours reach the DOM as `--color-*` custom properties on a wrapper, not `dark:`
// classes, so the appearance preview can repaint the screen live.

const DARK_QUERY = "(prefers-color-scheme: dark)"

function kebab(token: string): string {
  return token.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
}

/** The same tokens, as the custom properties `packages/shared/theme.css` declares. */
function toVariables(colors: ColorTokens, isDark: boolean): CSSProperties {
  const variables: Record<string, string> = {}

  for (const [token, value] of Object.entries(colors)) {
    variables[token === "cardShadow" ? "--shadow-card" : `--color-${kebab(token)}`] = value
  }

  variables.colorScheme = isDark ? "dark" : "light"

  return variables as CSSProperties
}

/* Reading the snapshot during render makes the first client paint match the server
   HTML, instead of correcting a frame later. */
function subscribeToSystemScheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function getSystemScheme() {
  return window.matchMedia(DARK_QUERY).matches
}

// The server cannot read the OS scheme, so it always reports light.
function getServerScheme() {
  return false
}

type ThemeContextValue = {
  isDark: boolean
  colors: ReturnType<typeof getColors>
  /** The live override driving the preview, not the value being edited. */
  scheme: ThemeScheme
  setScheme: (scheme: ThemeScheme) => void
  /** The same palette as `--color-*` custom properties, for a `style` prop. */
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
  // Seeded from the stored preference, so the picker shows what the page renders.
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
      vars: toVariables(colors, isDark),
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