import { type ColorScheme, getColors, type ColorTokens, type ThemeScheme } from "@repo/shared"
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react"
import { Appearance, Platform, useColorScheme } from "react-native"
import { VariableContextProvider } from "nativewind"

/**
 * The app-wide theme, as runtime CSS variables. Native runs Nativewind v5 (Tailwind v4),
 * where dark mode is `prefers-color-scheme`, the only mode v5 has on native. On web
 * nothing is emitted until mounted, or the server's inline `style` sticks.
 */

/** `#FC4C02` and friends, in the form `packages/shared/theme.css` declares. */
function toVariables(tokens: ColorTokens): Record<string, string> {
  const variables: Record<string, string> = {}

  for (const [token, value] of Object.entries(tokens)) {
    variables[token === "cardShadow" ? "--shadow-card" : `--color-${kebab(token)}`] = value
  }

  return variables
}

function kebab(token: string): string {
  return token.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
}

/** Shared so the memo below keeps its identity across renders. */
const NO_VARIABLES: Record<string, string> = {}

type ThemeContextValue = {
  /** The scheme in force — the override if there is one, otherwise the system's. */
  scheme: ColorScheme
  /** Set an explicit theme, or hand control back to the system with `"system"`. */
  setScheme: (scheme: ThemeScheme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  /* Null means "follow the system", so the resolved scheme is never `"system"`. */
  const [override, setOverride] = useState<ColorScheme | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => setHydrated(true), [])

  const scheme: ColorScheme = override ?? (systemScheme === "dark" ? "dark" : "light")

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      setScheme: (next) => {
        // No setter on React Native Web, where the scheme is only ever `matchMedia`.
        if (Platform.OS !== "web") {
          Appearance.setColorScheme(next === "system" ? "unspecified" : next)
        }
        setOverride(next === "system" ? null : next)
      },
    }),
    [scheme],
  )

  const variables = useMemo(() => {
    // Nothing until mounted on web, so hydration matches the server. Native has no
    // server pass, so waiting there would only cost a flash of the wrong theme.
    if (Platform.OS === "web" && !hydrated) return NO_VARIABLES
    return toVariables(getColors(scheme))
  }, [scheme, hydrated])

  // Web fills the values in here, because matchMedia alone cannot express an
  // explicit Light or Dark choice. Native resolves each token on its own.

  return (
    <ThemeContext.Provider value={value}>
      <VariableContextProvider value={variables}>{children}</VariableContextProvider>
    </ThemeContext.Provider>
  )
}

/** Resolved scheme, plus the setter the appearance slide needs. */
export function useThemeScheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useThemeScheme must be used inside <ThemeProvider>")
  return context
}