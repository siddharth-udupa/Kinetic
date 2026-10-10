import UploadNav from "@/components/shell/UploadNav"

export default function UploadLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    /*
     * Padded off the header via the shared `--shell-header-h` rather than the
     * `4rem`/`top-20` this used to hardcode, which no longer matched the header
     * at either breakpoint and left the sticky sub-nav overlapping it on desktop.
     */
    <div
      className="w-full py-8"
      style={{ minHeight: "calc(100dvh - var(--shell-header-h))" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row gap-8 items-start">
        <div
          className="w-full md:w-56 shrink-0"
          /* Clears the sticky header plus a gap. Using the variable keeps this in
             step with the header instead of drifting from it. */
          style={{ position: "sticky", top: "calc(var(--shell-header-h) + 1rem)" }}
        >
          <UploadNav />
        </div>
        {/* Reads the shell's `--ob-*` custom properties directly: this layout is
            a server component, so it cannot call the theme hook, but the
            variables are set on the shell wrapper above and inherit down. */}
        <main className="flex-1 w-full min-w-0 rounded-2xl border border-line bg-surface p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}