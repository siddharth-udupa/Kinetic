"use client"

import { type ColorTokens, getColors, type ThemeScheme } from "@repo/shared"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react"
import { writeSchemeHint } from "@/lib/theme-init"

// Colours reach the DOM as `--color-*` custom properties on a wrapper, not `dark:`
// classes, so the appearance preview can repaint the screen live. One provider
// owns the scheme for the whole app: a second one, nested, would repaint only the
// subtree below it and leave the header on the scheme the server painted.

const DARK_QUERY = "(prefers-color-scheme: dark)"

function kebab(token: string): string {
  return token.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
}

/** Shared so an unchanged scheme keeps the same object and React does not rewrite
 *  the style attribute on every render. */
const NO_VARIABLES: CSSProperties = {}

/* The same tokens, as the custom properties `packages/shared/theme.css` declares.
   Empty for a scheme the visitor did not pick: `theme.css` already darkens
   `:root` under `prefers-color-scheme`, so publishing the server's guess would
   outrank a stylesheet that is right — and freeze the page to whatever the OS
   was when the request was made. Only an explicit choice needs an override. */
function toVariables(colors: ColorTokens, isDark: boolean, scheme: ThemeScheme): CSSProperties {
  if (scheme === "system") return NO_VARIABLES

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
  /** The palette as `--color-*` custom properties, for a `style` prop. Empty while
   *  following the system — see `toVariables`. */
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
  // Seeded from the stored choice, so the picker shows what the page renders.
  const [scheme, setStoredScheme] = useState<ThemeScheme>(initialScheme)
  const systemIsDark = useSyncExternalStore(subscribeToSystemScheme, getSystemScheme, getServerScheme)

  const isDark = scheme === "dark" || (scheme === "system" && systemIsDark)
  const colors = getColors(isDark ? "dark" : "light")

  /* A choice has to outlive the page. Left only in memory it is gone on the next
     request, and the server paints the scheme the visitor no longer wants — the
     header snapping back a reload after a change. */
  const setScheme = useCallback((next: ThemeScheme) => {
    setStoredScheme(next)
    writeSchemeHint(next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      colors,
      scheme,
      setScheme,
      vars: toVariables(colors, isDark, scheme),
    }),
    [isDark, colors, scheme, setScheme],
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