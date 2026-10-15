import UploadNav from "@/components/shell/UploadNav"

export default function UploadLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    /* Padded off the shared `--shell-header-h`, so this tracks the header at
       both breakpoints. */
    <div
      className="w-full py-8"
      style={{ minHeight: "calc(100dvh - var(--shell-header-h))" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row gap-8 items-start">
        <div
          className="w-full md:w-56 shrink-0"
          /* Clears the sticky header plus a gap, via the shared variable. */
          style={{ position: "sticky", top: "calc(var(--shell-header-h) + 1rem)" }}
        >
          <UploadNav />
        </div>
        {/* Uses the shell's `--color-*` variables: this layout is a server
            component and cannot call the theme hook. */}
        <main className="flex-1 w-full min-w-0 rounded-2xl border border-line bg-surface p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}