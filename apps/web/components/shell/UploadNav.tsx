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

/** Upload flow navigation. Selection is carried by tint, word colour and weight, not colour alone. */
export default function UploadNav() {
  const pathname = usePathname()
  const { colors } = useTheme()

  return (
    <nav
      aria-label="Upload activity"
      className="overflow-hidden rounded-2xl border"
      style={{ backgroundColor: colors.surface, borderColor: colors.line }}
    >
      <p
        className="border-b px-4 py-3 text-[11px] font-semibold tracking-widest uppercase"
        style={{ borderColor: colors.line, color: colors.inkMuted }}
      >
        Upload activity
      </p>

      <ul>
        {LINKS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <li key={item.href} className="border-b last:border-b-0" style={{ borderColor: colors.line }}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-4 py-3.5 text-[14px] transition ${FOCUS} ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
                style={{
                  backgroundColor: isActive ? colors.accentSoft : "transparent",
                  color: isActive ? colors.accentText : colors.inkSecondary,
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