"use client"

import type { ThemeScheme } from "@repo/shared"
import type { ReactNode } from "react"
import { ThemeProvider, useTheme } from "@/hooks/useTheme"

// App-wide theme surface, so the nav uses the same palette as the pages it links
// into. Onboarding and auth keep their own provider: the appearance slide
// previews a theme, and a nested provider scopes that preview to the flow.
export function AppShell({
  children,
  scheme = "system",
}: {
  children: ReactNode
  /** The scheme the server already committed to, read from the cookie the
   *  pre-paint script writes. */
  scheme?: ThemeScheme
}) {
  return (
    <ThemeProvider initialScheme={scheme}>
      <ThemedShell>{children}</ThemedShell>
    </ThemeProvider>
  )
}

/** Publishes the resolved palette as `--color-*`. `<body>` is server-rendered, so the vars land here instead. */
function ThemedShell({ children }: { children: ReactNode }) {
  const { colors, vars } = useTheme()

  return (
    <div
      className="flex min-h-full flex-1 flex-col"
      style={{ ...vars, backgroundColor: colors.page }}
    >
      {children}
    </div>
  )
}