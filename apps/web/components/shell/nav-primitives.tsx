"use client"

import Link from "next/link"
import { type ReactNode, useState } from "react"
import { ChevronRight, UserRound } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"

/** Keyboard focus ring, shared by every nav control. */
export const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"

/** The mark and wordmark lockup. */
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

/** The circular avatar. Falls back to a neutral silhouette when there is no
 *  image, or when the image fails to load. */
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
  // A signed-out or changed account must get a fresh attempt, so remember which
  // URL failed rather than a plain boolean.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const imageSrc = src && failedSrc !== src ? src : null

  if (imageSrc) {
    // A plain <img>: the avatar host is unknown at build time, so next/image
    // would need every host allow-listed to optimise a 36px circle.
    return (
      // biome-ignore lint/performance/noImgElement: remote avatar host is not known at build time, so next/image cannot be configured for it
      <img
        src={imageSrc}
        alt={name ?? ""}
        // Google's avatar CDN throttles hotlinks that arrive with a Referer,
        // which is why this one image can fail while the rest of the page loads.
        referrerPolicy="no-referrer"
        decoding="async"
        onError={() => setFailedSrc(imageSrc)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, border: `1px solid ${colors.line}` }}
      />
    )
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: colors.surfaceMuted,
        color: colors.inkMuted,
        border: `1px solid ${colors.line}`,
      }}
      aria-hidden
    >
      <UserRound size={Math.round(size * 0.54)} strokeWidth={2} aria-hidden />
    </span>
  )
}

/** A floating panel: dropdown or mobile sheet. */
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
        // Light lifts the panel with a shadow. Dark has no luminance gap for one
        // to exploit, so it leans on the border and a deeper drop.
        boxShadow: isDark
          ? "0 18px 40px -22px rgba(0, 0, 0, 0.85)"
          : "0 18px 40px -24px rgba(15, 23, 42, 0.28)",
      }}
    >
      {children}
    </div>
  )
}

/** A row inside a panel. `chevron` marks a destination; `tone` is the only variation. */
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