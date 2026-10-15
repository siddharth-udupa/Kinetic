import { getColors } from "@repo/shared"
import { useThemeScheme } from "@/components/ThemeProvider"

/** Resolved colour scheme; the palette lives in `@repo/shared`. Native components (Ionicons,
 *  Reanimated) cannot take a Tailwind class, so the resolved palette comes back as `colors`. */
export function useTheme() {
  const { scheme } = useThemeScheme()
  const isDark = scheme === "dark"
  return { isDark, colors: getColors(isDark ? "dark" : "light") }
}