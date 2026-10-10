export type ThemeScheme = "system" | "light" | "dark"

export type ColorScheme = Exclude<ThemeScheme, "system">

export const BRAND_COLOR = "#FC4C02"


/** `#RGB` or `#RRGGBB` → its three channels. */
function parseHex(hex: string): [number, number, number] {
  const digits = hex.replace("#", "")
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((char) => char + char)
          .join("")
      : digits
  const channel = (start: number) => Number.parseInt(full.slice(start, start + 2), 16)
  return [channel(0), channel(2), channel(4)]
}

/** Applies an alpha to a hex colour, so a translucent token follows its base. */
function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * `#RRGGBB` → `"R G B"`, the form Tailwind's `rgb(var(--x) / <alpha-value>)`
 * needs so an opacity modifier like `bg-surface/50` has a slot to fill.
 */
export function toChannels(hex: string): string {
  return parseHex(hex).join(" ")
}

const DANGER_LIGHT = "#DC2626"
const DANGER_DARK = "#F87171"
const SUCCESS_LIGHT = "#16A34A"
const SUCCESS_DARK = "#22C55E"
const WARNING_LIGHT = "#B45309"
const WARNING_DARK = "#FBBF24"
const INFO_LIGHT = "#2563EB"
const INFO_DARK = "#60A5FA"

const LIGHT_COLORS = {
  // Surfaces
  page: "#F9FAFB",
  card: "#FFFFFF",
  cardHover: "#FAFAFA",
  cardPressed: "#F3F4F6",
  cardMuted: "#F3F4F6",
  cardMutedHover: "#ECEEF1",
  cardMutedPressed: "#E5E7EB",
  /** Lighter than its track, so a chosen segment reads as lifted off it. */
  raised: "#FFFFFF",
  raisedHover: "#F9FAFB",
  raisedPressed: "#F3F4F6",
  /** The border of a `raised` surface, as opposed to a content divider. */
  raisedBorder: "#E5E7EB",
  controlDisabled: "#F3F4F6",

  /*
   * The activity detail screen, which stacks three surfaces instead of two
   * because it sits over a map and needs the extra step to read as depth.
   */
  activityPage: "#F3F4F6",
  activityPanel: "#FFFFFF",
  activityCard: "#FAFAFA",
  activityBorder: "#E5E7EB",
  activityHandle: "#D1D5DB",

  // Borders
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  borderMuted: "#EDEFF2",

  // Text
  text: "#111827",
  // 7.0:1 and 4.8:1 on white. The previous pair (gray-500 / gray-400) put the
  // muted tier at 2.5:1, below the 4.5:1 minimum — helper text, step counters
  // and placeholders all washed out.
  textSecondary: "#4B5563",
  textMuted: "#6B7280",
  textDisabled: "#9CA3AF",
  textInverse: "#FFFFFF",

  /** A separate ink scale for the activity screen's dark-on-dark panel text. */
  activityText: "#111827",
  activityTextSecondary: "#4B5563",
  activityTextMuted: "#6B7280",

  // Brand accent
  accent: BRAND_COLOR,
  accentHover: "#E84802",
  accentPressed: "#CF3E02",
  /** The brand orange is only 3.4:1 on white, so words need a deeper tint. */
  accentText: "#B23A0B",
  accentSoft: withAlpha(BRAND_COLOR, 0.07),
  onAccent: "#FFFFFF",

  // Status
  danger: DANGER_LIGHT,
  dangerHover: "#B91C1C",
  dangerPressed: "#991B1B",
  dangerText: "#B91C1C",
  dangerSoft: withAlpha(DANGER_LIGHT, 0.08),
  success: SUCCESS_LIGHT,
  successHover: "#15803D",
  successPressed: "#166534",
  // 6.3:1 on `successSoft`, which is where status labels usually land. The old
  // #15803D — still the `successHover` fill — sat at 4.3:1 and failed AA.
  successText: "#116430",
  successSoft: withAlpha(SUCCESS_LIGHT, 0.09),
  warning: WARNING_LIGHT,
  warningHover: "#92400E",
  warningPressed: "#78350F",
  warningText: "#92400E",
  warningSoft: withAlpha(WARNING_LIGHT, 0.09),
  info: INFO_LIGHT,
  infoHover: "#1D4ED8",
  infoPressed: "#1E40AF",
  infoText: "#1D4ED8",
  infoSoft: withAlpha(INFO_LIGHT, 0.09),

  /*
   * The fifth hue in the activity tiles' categorical set. No base `purple`,
   * because it is only ever a chip tint and its label — there is nothing for a
   * solid or hover state to be a state *of*.
   */
  purpleText: "#6D28D9",
  purpleSoft: withAlpha("#7C3AED", 0.08),

  // Interaction
  /** Mobile uses `active:` throughout; a mouse has no press-and-hold. */
  trackHover: withAlpha("#FFFFFF", 0.75),
  trackPressed: withAlpha("#FFFFFF", 0.55),
  /** Translucent, so the ring stays visible around an accented control. */
  focusRing: withAlpha(BRAND_COLOR, 0.35),
  overlay: "rgba(17, 24, 39, 0.45)",

  /*
   * Elevation for the activity card. A shadow, not a colour, but it carries its
   * own alpha so it cannot live as a `withAlpha()` token — and it is the other
   * half of the palette's job. Dark needs a deeper, tighter drop: there is no
   * luminance gap for a shadow to exploit, so it does more of the lifting.
   */
  cardShadow: "0 10px 35px -18px rgba(15, 23, 42, 0.28)",

  // Charts
  chartLine: BRAND_COLOR,
  chartFill: withAlpha(BRAND_COLOR, 0.16),
  chartGrid: "#E5E7EB",
  chartAxis: "#D1D5DB",
  chartLabel: "#6B7280",
  chartCrosshair: "#9CA3AF",
} as const

export type ColorTokenName = keyof typeof LIGHT_COLORS

export type ColorTokens = Readonly<Record<ColorTokenName, string>>

const DARK_COLORS: ColorTokens = {
  // Surfaces
  page: "#020617",
  card: "#0F172A",
  cardHover: "#16213C",
  cardPressed: "#1E293B",
  cardMuted: "#1E293B",
  cardMutedHover: "#273549",
  cardMutedPressed: "#334155",
  /** Must go lighter than its track, or the pill reads as pressed in. */
  raised: "#334155",
  raisedHover: "#3B4A61",
  raisedPressed: "#475569",
  raisedBorder: "#475569",
  controlDisabled: "#1E293B",

  // The activity detail stack. Page is darker than `page` because these panels
  // float over a map rather than scrolling on it.
  activityPage: "#0B1220",
  activityPanel: "#0F1929",
  activityCard: "#111C2D",
  activityBorder: "#223149",
  activityHandle: "#43536B",

  // Borders
  border: "#1E293B",
  borderStrong: "#334155",
  borderMuted: "#17263B",

  // Text
  text: "#F8FAFC",
  textSecondary: "#94A3B8",
  // 5.2:1 on the page and 4.6:1 on a card. The previous slate-500 sat at 4.2:1
  // and 3.8:1, failing outright on a card.
  textMuted: "#748399",
  textDisabled: "#64748B",
  textInverse: "#0F172A",

  // The activity panels read as near-black in light mode too, so they carry
  // their own light-on-dark ink scale rather than borrowing `text`.
  activityText: "#D5DDE8",
  activityTextSecondary: "#B8C3D3",
  activityTextMuted: "#8A9AB2",

  // Brand accent
  accent: BRAND_COLOR,
  /** Elevation inverts: a hover lightens on a dark page, darkens on a light one. */
  accentHover: "#FF6B35",
  accentPressed: "#FF8A5C",
  /** Drops to 3.0:1 against the raised pill, so words lift a step to clear AA. */
  accentText: "#FF9A6E",
  accentSoft: withAlpha(BRAND_COLOR, 0.16),
  onAccent: "#FFFFFF",

  // Status
  danger: DANGER_DARK,
  dangerHover: "#FCA5A5",
  dangerPressed: "#FECACA",
  dangerText: "#FCA5A5",
  dangerSoft: withAlpha(DANGER_DARK, 0.12),
  success: SUCCESS_DARK,
  successHover: "#4ADE80",
  successPressed: "#86EFAC",
  successText: "#4ADE80",
  successSoft: withAlpha(SUCCESS_DARK, 0.12),
  warning: WARNING_DARK,
  warningHover: "#FCD34D",
  warningPressed: "#FDE68A",
  warningText: "#FCD34D",
  warningSoft: withAlpha(WARNING_DARK, 0.12),
  info: INFO_DARK,
  infoHover: "#93C5FD",
  infoPressed: "#BFDBFE",
  infoText: "#93C5FD",
  infoSoft: withAlpha(INFO_DARK, 0.12),
  purpleText: "#C4B5FD",
  purpleSoft: withAlpha("#A78BFA", 0.14),

  // Interaction
  trackHover: withAlpha("#334155", 0.55),
  trackPressed: withAlpha("#334155", 0.8),
  focusRing: withAlpha("#FF9A6E", 0.45),
  overlay: "rgba(2, 6, 23, 0.65)",
  cardShadow: "0 16px 40px -24px rgba(0, 0, 0, 0.8)",

  // Charts
  chartLine: BRAND_COLOR,
  chartFill: withAlpha(BRAND_COLOR, 0.2),
  chartGrid: "#1E293B",
  chartAxis: "#334155",
  chartLabel: "#94A3B8",
  chartCrosshair: "#64748B",
}

export const COLORS = {
  light: LIGHT_COLORS,
  dark: DARK_COLORS,
} as const

export function getColors(scheme: ColorScheme): ColorTokens {
  return COLORS[scheme]
}

/** `cardMuted` → `card-muted`. Both apps name their CSS vars off this. */
export function toKebab(token: string): string {
  return token.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
}

/**
 * `cardMuted` → `--ob-card-muted`.
 *
 * The prefix is historical and frozen: new code should use the named utilities in
 * `apps/web/app/globals.css` rather than raw `var()`. Renaming it is cheap — it is
 * one class constant in `components/onboarding/primitives.tsx` plus the block in
 * `globals.css`.
 */
export function toCssVarName(token: string): string {
  return `--ob-${toKebab(token)}`
}

/**
 * Flattens a palette into CSS custom properties for the DOM. The web app injects
 * these on the shell wrapper; mobile reads `getColors()` as data instead, since
 * NativeWind needs literal values to compile.
 *
 * `colorScheme` is included so native widgets follow the app rather than the OS.
 */
export function colorsToCssVars(
  colors: ColorTokens,
  isDark: boolean,
): Record<string, string> {
  const vars: Record<string, string> = {}

  for (const [token, value] of Object.entries(colors)) {
    vars[toCssVarName(token)] = value
  }

  vars.colorScheme = isDark ? "dark" : "light"

  return vars
}
