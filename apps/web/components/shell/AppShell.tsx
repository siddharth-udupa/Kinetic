"use client"

import type { ThemeScheme } from "@repo/shared"
import type { ReactNode } from "react"
import { ThemeProvider, useTheme } from "@/hooks/useTheme"

// App-wide theme surface, so the nav uses the same palette as the pages it links
// into. One provider for the whole app: auth and onboarding used to nest their
// own, which scoped a theme change to the subtree below it and left the header
// painted from the server's scheme.
export function AppShell({
  children,
  scheme = "system",
}: {
  children: ReactNode
  /** An explicit choice the visitor made, read from the cookie. Absent means the
   *  scheme follows the OS, which the server cannot know and need not guess. */
  scheme?: ThemeScheme
}) {
  return (
    <ThemeProvider initialScheme={scheme}>
      <ThemedShell>{children}</ThemedShell>
    </ThemeProvider>
  )
}

/** Publishes the palette as `--color-*`. `<body>` is server-rendered, so the vars
 *  land here instead — and only for a scheme the visitor picked, since `vars` is
 *  empty while following the system. An inline page colour to match would have the
 *  same effect, so it is left to the stylesheet too. */
function ThemedShell({ children }: { children: ReactNode }) {
  const { colors, vars } = useTheme()

  return (
    <div
      className="flex min-h-full flex-1 flex-col"
      style={{ ...vars, backgroundColor: vars.colorScheme ? colors.page : undefined }}
    >
      {children}
    </div>
  )
}