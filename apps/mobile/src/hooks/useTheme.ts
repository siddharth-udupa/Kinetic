import { getColors } from "@repo/shared"
import { useColorScheme } from "nativewind"

/**
 * Resolved colour scheme for the app.
 *
 * The palette itself lives in `@repo/shared` — this hook only resolves which one is
 * active. Web resolves the same tokens through `apps/web/hooks/useTheme.tsx`, so a colour
 * changed in `packages/shared/src/colors.ts` moves on both platforms at once.
 *
 * Tailwind classes cover surfaces and type, but anything handed to a native component
 * (Ionicons, Reanimated) needs a literal colour, so the resolved palette is returned
 * alongside `isDark` for those call sites.
 */
export function useTheme() {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === "dark"
  return { isDark, colors: getColors(isDark ? "dark" : "light") }
}