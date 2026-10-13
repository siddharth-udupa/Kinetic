import type { ColorTokenName } from "./colors"

/** Every token that becomes a colour class. `cardShadow` is the one that does not. */
type ColorToken = Exclude<ColorTokenName, "cardShadow">

/**
 * The Tailwind utility name each colour token is exposed as.
 *
 * A token has up to three names, and only one of them is short: the token key
 * (`surface`), the CSS custom property (`--ob-surface` on web, `--color-surface`
 * on mobile), and the class you actually write (`bg-surface`). This map is the
 * second one, so the two apps cannot disagree about it —
 * `apps/mobile/tailwind.config.ts` derives its whole colour block from here, and
 * `scripts/check-color-utilities.mjs` holds `apps/web/app/globals.css` to it.
 *
 * `satisfies Record<ColorToken, string>` makes it exhaustive: a token added to
 * `colors.ts` with no entry here will not compile. That is the step of "add a
 * colour" which used to fail silently — the class would simply not exist.
 *
 * Write one entry per line at two-space indent;
 * `scripts/check-color-utilities.mjs` reads this file as text and matches on
 * exactly that shape.
 */
export const COLOR_UTILITIES = {
  // Surfaces
  page: "page",
  surface: "surface",
  surfaceHover: "surface-hover",
  surfacePressed: "surface-pressed",
  surfaceMuted: "surface-muted",
  surfaceMutedHover: "surface-muted-hover",
  surfaceMutedPressed: "surface-muted-pressed",
  raised: "raised",
  raisedHover: "raised-hover",
  raisedPressed: "raised-pressed",
  raisedBorder: "raised-border",
  disabled: "disabled",

  // Activity detail
  activityPage: "activity-page",
  activityPanel: "activity-panel",
  activityCard: "activity-card",
  activityLine: "activity-line",
  activityHandle: "activity-handle",

  // Borders
  line: "line",
  lineStrong: "line-strong",
  lineMuted: "line-muted",

  // Text
  ink: "ink",
  inkSecondary: "ink-secondary",
  inkMuted: "ink-muted",
  inkDisabled: "ink-disabled",
  inkInverse: "ink-inverse",
  activityInk: "activity-ink",
  activityInkSecondary: "activity-ink-secondary",
  activityInkMuted: "activity-ink-muted",

  // Accent
  accent: "accent",
  accentHover: "accent-hover",
  accentPressed: "accent-pressed",
  accentText: "accent-text",
  accentSoft: "accent-soft",
  onAccent: "on-accent",

  // Status
  danger: "danger",
  dangerHover: "danger-hover",
  dangerPressed: "danger-pressed",
  dangerText: "danger-text",
  dangerSoft: "danger-soft",
  success: "success",
  successHover: "success-hover",
  successPressed: "success-pressed",
  successText: "success-text",
  successSoft: "success-soft",
  warning: "warning",
  warningHover: "warning-hover",
  warningPressed: "warning-pressed",
  warningText: "warning-text",
  warningSoft: "warning-soft",
  info: "info",
  infoHover: "info-hover",
  infoPressed: "info-pressed",
  infoText: "info-text",
  infoSoft: "info-soft",
  purpleText: "purple-text",
  purpleSoft: "purple-soft",

  // Interaction
  trackHover: "track-hover",
  trackPressed: "track-pressed",
  focusRing: "focus-ring",
  overlay: "overlay",

  // Charts
  chartLine: "chart-line",
  chartFill: "chart-fill",
  chartGrid: "chart-grid",
  chartAxis: "chart-axis",
  chartLabel: "chart-label",
  chartCrosshair: "chart-crosshair",
} as const satisfies Record<ColorToken, string>