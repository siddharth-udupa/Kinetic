import { type ColorScheme, getColors, type ColorTokens, type ThemeScheme } from "@repo/shared"
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react"
import { Appearance, Platform, useColorScheme } from "react-native"
import { VariableContextProvider } from "nativewind"

/**
 * The app-wide theme, as runtime CSS variables.
 *
 * Nativewind v5 compiles `@theme` values into the stylesheet, so a token would
 * keep whatever `theme.css` declares regardless of the theme. The Metro config
 * excludes every token from inlining, which leaves the stylesheet holding
 * references; this provider fills those references in for the active scheme.
 *
 * That is what lets one class name follow the resolved scheme — `bg-surface`
 * means light or dark without a `dark:` variant at every call site — and it is why
 * the values here are the same ones the web app reads from `@repo/shared`.
 *
 * v4 did this by swapping a `.dark` class on the root and redefining the custom
 * properties under it. v5 rejects that selector on native, so the swap happens
 * through React context instead.
 */

/** `#FC4C02` and friends, in the `--color-*` form the stylesheet references. */
function toVariables(tokens: ColorTokens): Record<string, string> {
  const variables: Record<string, string> = {}

  for (const [token, value] of Object.entries(tokens)) {
    variables[`--color-${kebab(token)}`] = value
  }

  // The one token that is a box-shadow rather than a colour. It points at its own
  // variable rather than carrying the value, so the geometry and its alpha stay
  // swappable at runtime like every colour above.
  variables["--shadow-card-value"] = tokens.cardShadow

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
        // Native has a real system-wide override and `useColorScheme` already
        // reads it back, so setting it is all that is needed. React Native Web has
        // no setter at all — the scheme there is only ever `matchMedia`, which the
        // override above carries on its own.
        if (Platform.OS !== "web") {
          Appearance.setColorScheme(next === "system" ? "unspecified" : next)
        }
        setOverride(next === "system" ? null : next)
      },
    }),
    [scheme],
  )

  const variables = useMemo(() => {
    /*
     * The web build is statically rendered, and the server has no way to know the
     * athlete's scheme, so it always emits the light palette. Handing React a
     * different inline `style` on the first client render than the markup it is
     * hydrating does not get corrected: hydration patches text, not attributes, so
     * the provider would keep the server's values and every token-driven class
     * (`bg-surface`, `text-ink`) would stay light for good.
     *
     * Emitting nothing until mounted makes both sides agree and lets the second
     * render set the real palette. Native never had a server pass, so it keeps the
     * resolved values from the first frame — waiting there would only cost a flash
     * of the wrong theme on a cold start.
     */
    if (Platform.OS === "web" && !hydrated) return NO_VARIABLES
    return toVariables(getColors(scheme))
  }, [scheme, hydrated])

  return (
    <ThemeContext.Provider value={value}>
      <VariableContextProvider value={variables}>{children}</VariableContextProvider>
    </ThemeContext.Provider>
  )
}

/**
 * The resolved scheme, and the setter for the one place that changes it.
 *
 * `useTheme` reads colours rather than the scheme, because that is what almost
 * every call site needs — the literal value for an icon or an SVG. The appearance
 * slide needs the other half: tapping a theme repaints the running app, so it has
 * to be able to set one.
 */
export function useThemeScheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useThemeScheme must be used inside <ThemeProvider>")
  return context
}