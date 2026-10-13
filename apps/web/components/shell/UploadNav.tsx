"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileUp, PenSquare } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"
import { FOCUS } from "@/components/shell/nav-primitives"

const LINKS = [
  { name: "Manual entry", href: "/upload/manual", icon: PenSquare },
  { name: "GPX file", href: "/upload/file", icon: FileUp },
]

/**
 * Section navigation for the upload flow.
 *
 * Reuses the shell's tokens and focus ring, and drops the old `orange-50` /
 * `border-orange-200` fill in favour of the accent-soft tint the rest of the app
 * uses to mark a selection. Selection is also carried by the word colour and a
 * weight change, so it survives being read at a glance or with the colour
 * stripped out.
 */
export default function UploadNav() {
  const pathname = usePathname()
  const { colors } = useTheme()

  return (
    <nav
      aria-label="Upload activity"
      className="overflow-hidden rounded-2xl border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <p
        className="border-b px-4 py-3 text-[11px] font-semibold tracking-widest uppercase"
        style={{ borderColor: colors.border, color: colors.textMuted }}
      >
        Upload activity
      </p>

      <ul>
        {LINKS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <li key={item.href} className="border-b last:border-b-0" style={{ borderColor: colors.border }}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-4 py-3.5 text-[14px] transition ${FOCUS} ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
                style={{
                  backgroundColor: isActive ? colors.accentSoft : "transparent",
                  color: isActive ? colors.accentText : colors.textSecondary,
                  boxShadow: isActive ? `inset 3px 0 0 0 ${colors.accent}` : "none",
                }}
              >
                <Icon size={17} strokeWidth={2} aria-hidden />
                {item.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}