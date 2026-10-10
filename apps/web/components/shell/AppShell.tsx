"use client"

import type { ThemeScheme } from "@repo/shared"
import type { ReactNode } from "react"
import {
  OnboardingThemeProvider,
  onboardingVars,
  useOnboardingTheme,
} from "@/components/onboarding/theme"

/**
 * The app-wide theme surface.
 *
 * Hoisted out of the onboarding and auth flows so the navigation can be drawn
 * from the same palette as the pages it links into — one set of tokens for the
 * whole shell, rather than a nav bar frozen in the pre-onboarding greys.
 *
 * Those two surfaces keep their *own* providers on purpose. The appearance slide
 * previews a theme by overriding the flow's scheme, and a nested provider is what
 * scopes that preview to the flow: without it, tapping "Dark" on slide five would
 * repaint the nav bar behind the user has not agreed to yet.
 */
export function AppShell({
  children,
  scheme = "system",
}: {
  children: ReactNode
  /**
   * The scheme the server already committed to, read from the cookie the pre-paint
   * script writes — so a server component emits the real palette, not a light guess.
   */
  scheme?: ThemeScheme
}) {
  return (
    <OnboardingThemeProvider initialScheme={scheme}>
      <ThemedShell>{children}</ThemedShell>
    </OnboardingThemeProvider>
  )
}

/**
 * Applies the resolved palette as `--ob-*` custom properties for everything
 * inside the shell.
 *
 * The vars land on this wrapper rather than on `<body>`: `<body>` is rendered by
 * the server, so a client component cannot attach the inline style to it. Any
 * descendant can then read `var(--ob-accent)` in a plain Tailwind class, which is
 * what keeps the nav's markup free of inline colour styling.
 */
function ThemedShell({ children }: { children: ReactNode }) {
  const { colors, isDark } = useOnboardingTheme()

  return (
    <div
      className="flex min-h-full flex-1 flex-col"
      style={{ ...onboardingVars(colors, isDark), backgroundColor: colors.page }}
    >
      {children}
    </div>
  )
}