export type ThemeScheme = "system" | "light" | "dark"

export type ColorScheme = Exclude<ThemeScheme, "system">

export const BRAND_COLOR = "#FC4C02"

/**
 * The palette, as values for the places a class cannot reach: an SVG attribute,
 * a Recharts prop, a MapLibre paint property, an icon.
 *
 * The colour classes come from `packages/shared/theme.css`, which both apps
 * import directly — this module does not feed it, and the two are kept in step
 * by hand. Name a token the same word in both places.
 */
const LIGHT_COLORS = {
  // Surfaces
  page: "#F9FAFB",
  surface: "#FFFFFF",
  surfaceHover: "#FAFAFA",
  surfacePressed: "#F3F4F6",
  surfaceMuted: "#F3F4F6",
  surfaceMutedHover: "#ECEEF1",
  surfaceMutedPressed: "#E5E7EB",
  raised: "#FFFFFF",
  raisedHover: "#F9FAFB",
  raisedPressed: "#F3F4F6",
  raisedBorder: "#E5E7EB",
  disabled: "#F3F4F6",

  // The activity detail screen, which stacks three surfaces instead of two
  // because it sits over a map and needs the extra step to read as depth.
  activityPage: "#F3F4F6",
  activityPanel: "#FFFFFF",
  activityCard: "#FAFAFA",
  activityLine: "#E5E7EB",
  activityHandle: "#D1D5DB",

  // Borders
  line: "#E5E7EB",
  lineStrong: "#D1D5DB",
  lineMuted: "#EDEFF2",

  // Text. The muted tier clears the 4.5:1 minimum on white, so helper text, step
  // counters and placeholders do not wash out.
  ink: "#111827",
  inkSecondary: "#4B5563",
  inkMuted: "#6B7280",
  inkDisabled: "#9CA3AF",
  inkInverse: "#FFFFFF",

  // The activity screen's own ink ramp, for its dark-on-dark panel text.
  activityInk: "#111827",
  activityInkSecondary: "#4B5563",
  activityInkMuted: "#6B7280",

  // Brand accent. The brand orange is only 3.4:1 on white, so words need a
  // deeper tint.
  accent: BRAND_COLOR,
  accentHover: "#E84802",
  accentPressed: "#CF3E02",
  accentText: "#B23A0B",
  accentSoft: "rgba(252, 76, 2, 0.07)",
  onAccent: "#FFFFFF",

  // Status
  danger: "#DC2626",
  dangerHover: "#B91C1C",
  dangerPressed: "#991B1B",
  dangerText: "#B91C1C",
  dangerSoft: "rgba(220, 38, 38, 0.08)",
  success: "#16A34A",
  successHover: "#15803D",
  successPressed: "#166534",
  // 6.3:1 on `successSoft`, which is where status labels usually land.
  successText: "#116430",
  successSoft: "rgba(22, 163, 74, 0.09)",
  warning: "#B45309",
  warningHover: "#92400E",
  warningPressed: "#78350F",
  warningText: "#92400E",
  warningSoft: "rgba(180, 83, 9, 0.09)",
  info: "#2563EB",
  infoHover: "#1D4ED8",
  infoPressed: "#1E40AF",
  infoText: "#1D4ED8",
  infoSoft: "rgba(37, 99, 235, 0.09)",

  // The fifth hue in the activity tiles' categorical set.
  purpleText: "#6D28D9",
  purpleSoft: "rgba(124, 58, 237, 0.08)",

  // Interaction
  trackHover: "rgba(255, 255, 255, 0.75)",
  trackPressed: "rgba(255, 255, 255, 0.55)",
  focusRing: "rgba(252, 76, 2, 0.35)",
  overlay: "rgba(17, 24, 39, 0.45)",

  // A box-shadow, not a colour.
  cardShadow: "0 10px 35px -18px rgba(15, 23, 42, 0.28)",

  // Charts
  chartLine: BRAND_COLOR,
  chartFill: "rgba(252, 76, 2, 0.16)",
  chartGrid: "#E5E7EB",
  chartAxis: "#D1D5DB",
  chartLabel: "#6B7280",
  chartCrosshair: "#9CA3AF",
} as const

export type ColorTokenName = keyof typeof LIGHT_COLORS

export type ColorTokens = Readonly<Record<ColorTokenName, string>>

const DARK_COLORS: ColorTokens = {
  // Surfaces. Elevation inverts: a hover lightens on a dark page, darkens on a
  // light one.
  page: "#020617",
  surface: "#0F172A",
  surfaceHover: "#16213C",
  surfacePressed: "#1E293B",
  surfaceMuted: "#1E293B",
  surfaceMutedHover: "#273549",
  surfaceMutedPressed: "#334155",
  raised: "#334155",
  raisedHover: "#3B4A61",
  raisedPressed: "#475569",
  raisedBorder: "#475569",
  disabled: "#1E293B",

  // The activity detail stack, darker than `page` because these panels float
  // over a map rather than scrolling on it.
  activityPage: "#0B1220",
  activityPanel: "#0F1929",
  activityCard: "#111C2D",
  activityLine: "#223149",
  activityHandle: "#43536B",

  // Borders
  line: "#1E293B",
  lineStrong: "#334155",
  lineMuted: "#17263B",

  // Text
  ink: "#F8FAFC",
  inkSecondary: "#94A3B8",
  inkMuted: "#748399",
  inkDisabled: "#64748B",
  inkInverse: "#0F172A",

  // The activity panels read as near-black in light mode too, so they carry their
  // own light-on-dark ink ramp rather than borrowing `ink`.
  activityInk: "#D5DDE8",
  activityInkSecondary: "#B8C3D3",
  activityInkMuted: "#8A9AB2",

  // Brand accent
  accent: BRAND_COLOR,
  accentHover: "#FF6B35",
  accentPressed: "#FF8A5C",
  // Drops to 3.0:1 against the raised pill, so words lift a step to clear AA.
  accentText: "#FF9A6E",
  accentSoft: "rgba(252, 76, 2, 0.16)",
  onAccent: "#FFFFFF",

  // Status
  danger: "#F87171",
  dangerHover: "#FCA5A5",
  dangerPressed: "#FECACA",
  dangerText: "#FCA5A5",
  dangerSoft: "rgba(248, 113, 113, 0.12)",
  success: "#22C55E",
  successHover: "#4ADE80",
  successPressed: "#86EFAC",
  successText: "#4ADE80",
  successSoft: "rgba(34, 197, 94, 0.12)",
  warning: "#FBBF24",
  warningHover: "#FCD34D",
  warningPressed: "#FDE68A",
  warningText: "#FCD34D",
  warningSoft: "rgba(251, 191, 36, 0.12)",
  info: "#60A5FA",
  infoHover: "#93C5FD",
  infoPressed: "#BFDBFE",
  infoText: "#93C5FD",
  infoSoft: "rgba(96, 165, 250, 0.12)",
  purpleText: "#C4B5FD",
  purpleSoft: "rgba(167, 139, 250, 0.14)",

  // Interaction
  trackHover: "rgba(51, 65, 85, 0.55)",
  trackPressed: "rgba(51, 65, 85, 0.8)",
  focusRing: "rgba(255, 154, 110, 0.45)",
  overlay: "rgba(2, 6, 23, 0.65)",
  cardShadow: "0 16px 40px -24px rgba(0, 0, 0, 0.8)",

  // Charts
  chartLine: BRAND_COLOR,
  chartFill: "rgba(252, 76, 2, 0.2)",
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