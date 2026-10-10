import { getColors } from "@repo/shared"
import { useColorScheme } from "nativewind"

/**
 * Resolved colour scheme for the app.
 *
 * The palette itself lives in `@repo/shared` — this module only owns the React
 * hook that resolves which one is active. That split is the whole point: the web
 * app resolves the same tokens through `components/theme.tsx`, so a colour
 * changed in `packages/shared/src/colors.ts` moves on both platforms at once. Do
 * not add a colour here.
 *
 * Tailwind classes cover surfaces and type, but anything handed to a native
 * component (Ionicons, Reanimated styles) needs a literal colour, so both themes
 * live in the shared tokens and the resolved scheme picks one. Reading the scheme
 * rather than hardcoding `dark:` classes is what lets the onboarding appearance
 * slide preview a theme live — the whole screen follows the override, icons
 * included.
 */
export function useTheme() {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === "dark"
  return { isDark, colors: getColors(isDark ? "dark" : "light") }
}