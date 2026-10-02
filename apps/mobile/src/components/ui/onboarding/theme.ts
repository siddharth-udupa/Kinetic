import { type ColorTokens, getColors } from "@repo/shared"
import { useColorScheme } from "nativewind"

/**
 * The palette itself lives in `@repo/shared` — this module only owns the React
 * hook that resolves which one is active.
 *
 * Keeping the values out of here is the whole point: the web app resolves the
 * same tokens through `components/onboarding/theme.tsx`, so a colour changed in
 * `packages/shared/src/colors.ts` moves on both platforms at once. Do not add a
 * colour here.
 */

/** @deprecated Re-exported from `@repo/shared`. Import it from there instead. */
export type OnboardingColors = ColorTokens

/**
 * Resolved colour scheme for the flow.
 *
 * Tailwind classes cover surfaces and type, but anything handed to a native
 * component (Ionicons, Reanimated styles) needs a literal colour, so both
 * themes live in the shared tokens and the resolved scheme picks one. Reading
 * the scheme rather than hardcoding `dark:` classes is what lets the appearance
 * slide preview a theme live — the whole screen follows the override, icons
 * included.
 */
export function useOnboardingTheme() {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === "dark"
  return { isDark, colors: getColors(isDark ? "dark" : "light") }
}
