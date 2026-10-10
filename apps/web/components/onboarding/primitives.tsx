"use client"

import type { ReactNode } from "react"
import { COLORS, getColors } from "@repo/shared"
import { ICONS, type IconName } from "./icons"
import { useTheme } from "../theme"
import type { OnboardingPrefs } from "./prefs"

export type { IconName }

const ChevronForward = ICONS["chevron-forward"]

/**
 * A preference value narrowed to a string.
 *
 * Every `OnboardingPrefs` field is a string union, but TypeScript cannot prove
 * that for an unresolved `K extends keyof OnboardingPrefs`. The intersection
 * gives the generic components below something they can constrain on.
 */
export type PrefValue<K extends keyof OnboardingPrefs> = OnboardingPrefs[K] & string

/**
 * Keyboard focus ring, shared by every control.
 *
 * On mobile the platform draws it; a browser needs an explicit one or the flow
 * is unusable without a mouse.
 */
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ob-accent)]"

/* ── Layout ────────────────────────────────────────────────────────────── */

/**
 * The frame every slide shares: a scrolling body and a footer that stays
 * pinned to the bottom.
 *
 * Pinning the action keeps the primary button in the same place on every slide
 * (so it never has to be hunted for), and the body owns the scroll so a short
 * viewport never pushes the button off screen.
 *
 * The column is capped and centred rather than stretched: on a phone the cap is
 * inactive and the slide is edge to edge, exactly as on mobile; on a desktop it
 * stops the line length and the gap between a choice and its radio dot from
 * drifting apart.
 *
 * Centring is done with `my-auto` on the column rather than `justify-center` on
 * the scroller: a centred flex child is clipped off the top the moment it
 * outgrows the box, and a short viewport is exactly when a slide is tallest.
 */
export function SlideShell({
  children,
  footer,
  center = false,
}: {
  children: ReactNode
  footer?: ReactNode
  center?: boolean
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={[
          "ob-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-2",
          footer ? "pb-4" : "pb-7",
        ].join(" ")}
      >
        <div className={`mx-auto w-full max-w-xl ${center ? "my-auto" : ""}`}>{children}</div>
      </div>

      {footer ? (
        <div className="shrink-0 px-6 pt-1 pb-1">
          <div className="mx-auto w-full max-w-xl">{footer}</div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Icon plate, heading and subheading.
 *
 * The plate is a low-contrast accent tint rather than a solid brand block — a
 * row of these competing with the buttons underneath them is what made the old
 * slides read as busy.
 */
export function SlideHeading({
  icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon?: IconName
  eyebrow?: string
  title: string
  subtitle?: string
}) {
  const { colors } = useTheme()

  return (
    <div className="mb-7">
      {icon ? (
        <div className="mb-5">
          <IconBadge icon={icon} />
        </div>
      ) : null}

      {eyebrow ? (
        <p
          className="mb-2.5 text-xs font-semibold tracking-widest uppercase"
          style={{ color: colors.accentText }}
        >
          {eyebrow}
        </p>
      ) : null}

      <h2 className="text-[28px] leading-9 font-bold text-balance" style={{ color: colors.text }}>
        {title}
      </h2>

      {subtitle ? (
        <p
          className="mt-3 text-[15px] leading-6 text-pretty"
          style={{ color: colors.textSecondary }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}

export function IconBadge({ icon, size = 48 }: { icon: IconName; size?: number }) {
  const { colors } = useTheme()
  const Icon = ICONS[icon]

  return (
    <div
      className="flex items-center justify-center rounded-2xl"
      style={{ width: size, height: size, backgroundColor: colors.accentSoft }}
    >
      <Icon
        size={Math.round(size * 0.46)}
        strokeWidth={2}
        style={{ color: colors.accent }}
        aria-hidden
      />
    </div>
  )
}

/* ── Buttons ───────────────────────────────────────────────────────────── */

function Spinner({ color }: { color: string }) {
  return (
    <svg
      className="animate-spin"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      style={{ color }}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/**
 * The one saturated surface allowed on a slide.
 *
 * Keeping a single accent-filled element per screen is what stops the flow
 * reading as a wall of competing buttons — every other control in the flow is
 * outlined, tinted or text-only.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  icon?: IconName
}) {
  const { colors } = useTheme()
  const blocked = disabled && !loading
  const contentColor = blocked ? colors.textMuted : colors.onAccent
  const Icon = icon ? ICONS[icon] : null

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled || loading}
      aria-label={label}
      aria-busy={loading || undefined}
      className={`flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold transition active:opacity-80 disabled:cursor-not-allowed ${FOCUS}`}
      style={{ backgroundColor: blocked ? colors.cardMuted : colors.accent }}
    >
      {loading ? (
        <Spinner color={contentColor} />
      ) : (
        <>
          <span style={{ color: contentColor }}>{label}</span>
          {Icon ? <Icon size={18} strokeWidth={2} style={{ color: contentColor }} aria-hidden /> : null}
        </>
      )}
    </button>
  )
}

export function GhostButton({
  label,
  onPress,
  icon,
}: {
  label: string
  onPress: () => void
  icon?: IconName
}) {
  const { colors } = useTheme()
  const Icon = icon ? ICONS[icon] : null

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      className={`flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border text-[15px] font-semibold transition active:opacity-70 ${FOCUS}`}
      style={{ borderColor: colors.border, backgroundColor: colors.card }}
    >
      <span style={{ color: colors.textSecondary }}>{label}</span>
      {Icon ? <Icon size={17} strokeWidth={2} style={{ color: colors.textMuted }} aria-hidden /> : null}
    </button>
  )
}

/** Low-emphasis inline action for "…or just accept the default" moments. */
export function TextAction({
  label,
  onPress,
  icon = "chevron-forward",
}: {
  label: string
  onPress: () => void
  icon?: IconName
}) {
  const { colors } = useTheme()
  const Icon = ICONS[icon]

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      className={`flex cursor-pointer items-center gap-1 py-2 text-start active:opacity-60 ${FOCUS}`}
    >
      <span className="text-sm font-semibold" style={{ color: colors.accentText }}>
        {label}
      </span>
      <Icon size={14} strokeWidth={2} style={{ color: colors.accentText }} aria-hidden />
    </button>
  )
}

/* ── Selection controls ────────────────────────────────────────────────── */

/**
 * Selected state is a border, a tint and a filled dot — never a solid fill.
 * The old options were full-colour blocks, so a glance could not tell which of
 * them was actually chosen.
 */
export function RadioDot({ selected }: { selected: boolean }) {
  const { colors } = useTheme()

  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
      style={{ borderColor: selected ? colors.accent : colors.borderStrong }}
    >
      {selected ? (
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: colors.accent }}
        />
      ) : null}
    </span>
  )
}

export function ChoiceCard({
  icon,
  title,
  subtitle,
  chips,
  selected,
  onPress,
}: {
  icon: IconName
  title: string
  subtitle: string
  chips?: string[]
  selected: boolean
  onPress: () => void
}) {
  const { colors } = useTheme()
  const Icon = ICONS[icon]

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={title}
      onClick={onPress}
      className={`mb-3 w-full cursor-pointer rounded-2xl border-2 p-5 text-start transition active:opacity-80 ${FOCUS} ${
        selected
          ? "bg-(--ob-accent-soft)"
          : "bg-(--ob-card) hover:bg-(--ob-card-hover)"
      }`}
      style={{ borderColor: selected ? colors.accent : colors.border }}
    >
      <div className="flex items-start justify-between">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: selected ? colors.accent : colors.cardMuted }}
        >
          <Icon
            size={20}
            strokeWidth={2}
            style={{ color: selected ? colors.onAccent : colors.textSecondary }}
            aria-hidden
          />
        </span>
        <RadioDot selected={selected} />
      </div>

      <span
        className="mt-4 block text-[17px] font-semibold"
        style={{ color: colors.text }}
      >
        {title}
      </span>
      <span
        className="mt-1 block text-[14px] leading-5"
        style={{ color: colors.textSecondary }}
      >
        {subtitle}
      </span>

      {chips ? (
        <span className="mt-3.5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Chip key={chip} label={chip} />
          ))}
        </span>
      ) : null}
    </button>
  )
}

/**
 * Segmented control on a muted track, with the chosen option lifted onto a
 * raised pill. Reads as a physical control rather than a row of buttons.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (value: T) => void
}) {
  const { colors } = useTheme()

  return (
    <div
      role="radiogroup"
      className="flex gap-1 rounded-xl p-1"
      style={{ backgroundColor: colors.cardMuted }}
    >
      {options.map((option) => {
        const selected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={`flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg border px-1 transition active:opacity-70 ${FOCUS} ${
              /* Only the unselected state is left to the class, so the hover
                 tint is not overridden by an inline transparent background. */
              selected ? "" : "hover:bg-(--ob-track-hover)"
            }`}
            style={
              selected
                ? { backgroundColor: colors.raised, borderColor: colors.raisedBorder }
                : undefined
            }
          >
            <span
              className="truncate text-[13px] font-semibold"
              style={{ color: selected ? colors.accentText : colors.textSecondary }}
            >
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** A labelled segmented control — the repeating unit of the units screen. */
export function SettingRow<K extends keyof OnboardingPrefs>({
  label,
  icon,
  options,
  value,
  onChange,
}: {
  label: string
  icon: IconName
  options: { label: string; value: PrefValue<K> }[]
  value: PrefValue<K>
  onChange: (value: PrefValue<K>) => void
}) {
  const { colors } = useTheme()
  const Icon = ICONS[icon]

  return (
    <div className="mb-4">
      <div className="mb-2.5 flex items-center gap-2">
        <Icon size={15} strokeWidth={2} style={{ color: colors.textMuted }} aria-hidden />
        <span className="text-[13px] font-semibold" style={{ color: colors.textSecondary }}>
          {label}
        </span>
      </div>
      <Segmented options={options} value={value} onChange={onChange} />
    </div>
  )
}

/* ── Content blocks ────────────────────────────────────────────────────── */

export function Banner({
  tone,
  icon,
  children,
}: {
  tone: "info" | "danger"
  icon: IconName
  children: ReactNode
}) {
  const { colors } = useTheme()
  const isDanger = tone === "danger"
  const Icon = ICONS[icon]

  return (
    <div
      className="mb-4 flex items-start gap-2.5 rounded-xl px-3.5 py-3"
      style={{ backgroundColor: isDanger ? colors.dangerSoft : colors.accentSoft }}
    >
      <Icon
        size={16}
        strokeWidth={2}
        className="mt-0.5 shrink-0"
        style={{ color: isDanger ? colors.danger : colors.accent }}
        aria-hidden
      />
      <div
        className="flex-1 text-[13px] leading-5"
        style={{ color: isDanger ? colors.danger : colors.textSecondary }}
      >
        {children}
      </div>
    </div>
  )
}

export function Chip({ label }: { label: string }) {
  const { colors } = useTheme()

  return (
    <span
      className="rounded-md px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: colors.cardMuted }}
    >
      <span style={{ color: colors.textSecondary }}>{label}</span>
    </span>
  )
}

export function ReviewRow({
  label,
  value,
  onPress,
  isLast = false,
}: {
  label: string
  value: string
  onPress: () => void
  isLast?: boolean
}) {
  const { colors } = useTheme()

  return (
    <>
      <button
        type="button"
        onClick={onPress}
        aria-label={`${label}: ${value}. Change`}
        className={`flex w-full cursor-pointer items-center justify-between py-3.5 text-start transition active:opacity-60 ${FOCUS}`}
      >
        <span className="text-[15px]" style={{ color: colors.textSecondary }}>
          {label}
        </span>
        <span className="flex flex-1 items-center justify-end gap-1.5 pl-4">
          <span
            className="truncate text-[15px] font-semibold"
            style={{ color: colors.text }}
          >
            {value}
          </span>
          <ChevronForward style={{ color: colors.textMuted }} size={16} strokeWidth={2} aria-hidden />
        </span>
      </button>

      {isLast ? null : <div className="h-px" style={{ backgroundColor: colors.border }} />}
    </>
  )
}

export function ReviewSection({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme()

  return (
    <section className="mb-4">
      <h3
        className="mb-2.5 text-xs font-semibold tracking-widest uppercase"
        style={{ color: colors.textMuted }}
      >
        {title}
      </h3>
      <div
        className="rounded-2xl border px-4"
        style={{ borderColor: colors.border, backgroundColor: colors.card }}
      >
        {children}
      </div>
    </section>
  )
}

/** Hoisted: declared inside the renderer, it would remount on every render. */
function PreviewHalf({ tone }: { tone: "light" | "dark" }) {
  // Deliberately the palette for `tone` rather than the live one — showing the
  // theme the athlete has not picked yet is the whole point of the thumbnail.
  const p = getColors(tone)

  return (
    <div className="h-full flex-1 px-1.5 py-2" style={{ backgroundColor: p.card }}>
      <div className="mb-1 h-1 w-4 rounded-full" style={{ backgroundColor: p.borderStrong }} />
      <div className="mb-1 h-1 w-6 rounded-full" style={{ backgroundColor: p.border }} />
      <div className="h-1 w-5 rounded-full" style={{ backgroundColor: p.accent }} />
    </div>
  )
}

/**
 * Miniature of the app in a given theme, so the choice is made by looking
 * rather than by reading a label.
 */
export function ThemePreview({ scheme }: { scheme: "light" | "dark" | "system" }) {
  const dominant = scheme === "system" ? "light" : scheme

  return (
    <div
      className="h-16 w-full overflow-hidden rounded-xl border"
      style={{ borderColor: getColors(dominant).borderStrong }}
    >
      <div className="flex h-full flex-1">
        {scheme === "system" ? (
          <>
            <PreviewHalf tone="light" />
            <div className="w-px" style={{ backgroundColor: COLORS.light.textDisabled }} />
            <PreviewHalf tone="dark" />
          </>
        ) : (
          <PreviewHalf tone={scheme} />
        )}
      </div>
    </div>
  )
}
