"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"

/**
 * Keyboard focus ring, identical to the one the onboarding flow uses.
 *
 * Every control in the nav composes this rather than inventing its own, so the
 * focus treatment matches on the header and on the slides behind it.
 */
export const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"

/**
 * The mark and wordmark lockup.
 *
 * The old navbar leaned on a hard-coded two-path chevron logo plus a giant orange
 * italic wordmark. It is replaced with the accent-soft plate the onboarding
 * slides already use for their icon badges, so the brand reads as part of the
 * same system instead of bolted on top of it.
 */
export function BrandMark({
  name,
  icon,
  size = 34,
}: {
  name: string
  icon: ReactNode
  size?: number
}) {
  const { colors } = useTheme()

  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex shrink-0 items-center justify-center rounded-xl"
        style={{ width: size, height: size, backgroundColor: colors.accentSoft }}
        aria-hidden
      >
        {icon}
      </span>
      <span
        className="text-[17px] leading-none font-bold tracking-tight"
        style={{ color: colors.ink }}
      >
        {name}
      </span>
    </span>
  )
}

/**
 * The circular avatar.
 *
 * Falls back to initials on an accent plate. The old version used a brand
 * gradient — the one treatment the new system deliberately avoids — because a
 * gradient at 36px reads as noise rather than as an identity.
 */
export function Avatar({
  src,
  name,
  size = 36,
}: {
  src?: string | null
  name?: string | null
  size?: number
}) {
  const { colors } = useTheme()

  if (src) {
    // A plain <img>: the URL comes from the auth provider and is unknown at
    // build time, so next/image would need every host allow-listed to optimise
    // a 36px circle. `alt` is empty because the name sits beside it.
    return (
      // biome-ignore lint/performance/noImgElement: remote avatar host is not known at build time, so next/image cannot be configured for it
      <img
        src={src}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, border: `1px solid ${colors.line}` }}
      />
    )
  }

  const initials = (name ?? "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: colors.accentSoft,
        color: colors.accent,
        border: `1px solid ${colors.line}`,
      }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  )
}

/**
 * A floating panel: dropdown or mobile sheet.
 *
 * The old nav used `rounded-md shadow-lg border-gray-100` on a white background
 * that did not survive dark mode. This reads its surface, border and shadow from
 * the theme tokens, so a panel is the same object on either scheme.
 */
export function NavPanel({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  const { colors, isDark } = useTheme()

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${className}`}
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.line,
        // Light needs the shadow to lift the panel off the page. Dark has no
        // luminance gap for a shadow to exploit, so it leans on the border and
        // a deeper, softer drop.
        boxShadow: isDark
          ? "0 18px 40px -22px rgba(0, 0, 0, 0.85)"
          : "0 18px 40px -24px rgba(15, 23, 42, 0.28)",
      }}
    >
      {children}
    </div>
  )
}

/**
 * A row inside a panel.
 *
 * `chevron` marks the row as a destination rather than an action, which is what
 * separates "Activity feed" from "Sign out" at a glance. `tone` is the only
 * place a destructive row is allowed to differ from the rest.
 */
export function NavRow({
  href,
  onClick,
  icon,
  label,
  detail,
  chevron = false,
  tone = "default",
}: {
  href?: string
  onClick?: () => void
  icon?: ReactNode
  label: string
  detail?: string
  chevron?: boolean
  tone?: "default" | "danger"
}) {
  const { colors } = useTheme()
  const isDanger = tone === "danger"
  const color = isDanger ? colors.danger : colors.inkSecondary

  const className = `flex w-full items-center gap-3 px-4 py-3 text-start transition active:opacity-70 hover:bg-surface-muted ${FOCUS}`

  const content = (
    <>
      {icon ? (
        <span className="flex shrink-0 items-center" style={{ color }}>
          {icon}
        </span>
      ) : null}

      <span className="flex-1">
        <span className="block text-[14px] font-semibold" style={{ color }}>
          {label}
        </span>
        {detail ? (
          <span className="mt-0.5 block text-[12px]" style={{ color: colors.inkMuted }}>
            {detail}
          </span>
        ) : null}
      </span>

      {chevron ? (
        <ChevronRight size={16} strokeWidth={2} style={{ color: colors.inkMuted }} aria-hidden />
      ) : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}

/** Hairline between groups inside a panel. */
export function NavDivider() {
  const { colors } = useTheme()
  return <div className="h-px" style={{ backgroundColor: colors.line }} role="presentation" />
}

/** Section label inside a panel — the same eyebrow tier the slides use. */
export function NavSectionLabel({ children }: { children: ReactNode }) {
  const { colors } = useTheme()

  return (
    <p
      className="px-4 pt-4 pb-2 text-[11px] font-semibold tracking-widest uppercase"
      style={{ color: colors.inkMuted }}
    >
      {children}
    </p>
  )
}

/** Shared type so callers can describe their own destinations. */
export type NavDestination = {
  label: string
  href: string
  detail?: string
}