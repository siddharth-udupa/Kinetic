const { BRAND_COLOR, COLORS } = require("@repo/shared") as typeof import("@repo/shared")

/*
 * Shared colours → NativeWind utilities.
 *
 * The tokens live in `packages/shared/src/colors.ts`. This file is the only
 * bridge between them and the mobile app: edit a value there and every class
 * built on it follows, on both platforms.
 *
 * `require` rather than `import` because `nativewind/preset` ships no type
 * declarations, and a value `import` would make this an ES module and break the
 * `require` the config already uses. The `typeof import(...)` annotation keeps
 * every token key type-checked, so a renamed colour fails here rather than
 * silently rendering as an unset utility.
 *
 * How a token becomes a class:
 *
 *   - Opaque hex tokens are emitted as CSS custom properties in `R G B` channel
 *     form on `:root` and `.dark`, then referenced through
 *     `rgb(var(--token) / <alpha-value>)`. Tailwind's own convention, and the
 *     only one that keeps opacity modifiers working — `bg-surface/50` has to
 *     compose with the live value, which a flattened hex cannot do.
 *   - Functional tokens (`rgba(...)` values like `accentSoft`, `overlay`,
 *     `focusRing`) already carry their own alpha, so they are emitted verbatim
 *     and referenced as `var(--token)`. An opacity modifier on those would be
 *     meaningless, so there is deliberately no `<alpha-value>` placeholder.
 *
 * A token gets BOTH schemes' values as custom properties, which is what lets one
 * class name follow the resolved scheme: `bg-surface` resolves to the light
 * value by default and to the dark value under `.dark`. `setColorScheme()` from
 * NativeWind swaps that root class, so the appearance slide preview still works
 * as it did before.
 *
 * Add the token to `packages/shared/src/colors.ts` first, then name it in
 * `COLORS` below.
 */

/** `#RRGGBB` → `"R G B"`, which is the form `rgb(var(--x) / <alpha>)` needs. */
function channels(hex: string): string {
  const digits = hex.replace("#", "")
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((char) => char + char)
          .join("")
      : digits
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16))
  return `${r} ${g} ${b}`
}

/** `cardMuted` → `--color-card-muted`. */
function varName(token: string): string {
  return `--color-${token.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`
}

const HEX_ONLY = /^#[0-9a-f]{6}$/i
const isOpaque = (value: string) => HEX_ONLY.test(value)

const tokens = Object.keys(COLORS.light) as (keyof typeof COLORS.light)[]

/**
 * Tokens opaque in both themes: referenced as channels so `/opacity` works.
 *
 * The check is on both themes on purpose. A token that is a hex in light but an
 * `rgba()` in dark cannot be referenced the same way in both, so it falls
 * through to the functional branch below and simply loses opacity modifiers.
 */
const opaqueTokens = tokens.filter(
  (token) => isOpaque(COLORS.light[token]) && isOpaque(COLORS.dark[token]),
)

/** Tokens carrying their own alpha in both themes: emitted verbatim. */
const functionalTokens = tokens.filter(
  (token) => !opaqueTokens.includes(token),
)

/** The custom properties for one scheme, split by how each kind is referenced. */
function variablesFor(scheme: "light" | "dark") {
  return Object.fromEntries([
    ...opaqueTokens.map((token) => [varName(token), channels(COLORS[scheme][token])]),
    ...functionalTokens.map((token) => [varName(token), COLORS[scheme][token]]),
  ])
}

/** Every shared token, in the form Tailwind expects to build utilities from. */
function themeColor(token: keyof typeof COLORS.light) {
  return opaqueTokens.includes(token)
    ? `rgb(var(${varName(token)}) / <alpha-value>)`
    : `var(${varName(token)})`
}

/**
 * Every token the app uses is exposed as a themed class name.
 *
 * A themed name is one class that resolves correctly in both schemes, so a
 * component writes `bg-surface` once instead of a `light:`/`dark:` pair and the
 * palette stays the only place a colour is defined.
 *
 * Anything not listed here is still available as a literal from the shared
 * palette: `useOnboardingTheme().colors.accent` returns the resolved value for
 * the active scheme, which is the right tool for native components (icons,
 * Skia, Reanimated) that need a concrete colour rather than a class.
 *
 * `brand` stays flat and unthemed, matching what `globals.css` does on the web.
 */
const COLORS_THEMED = {
  // ── Surfaces ──────────────────────────────────────────────────────────
  page: "page",
  surface: "card",
  "surface-muted": "cardMuted",
  "surface-muted-hover": "cardMutedHover",
  "surface-hover": "cardHover",
  "surface-pressed": "cardPressed",
  raised: "raised",
  "raised-hover": "raisedHover",
  "raised-pressed": "raisedPressed",
  disabled: "controlDisabled",

  // ── Activity detail ───────────────────────────────────────────────────
  "activity-page": "activityPage",
  "activity-panel": "activityPanel",
  "activity-card": "activityCard",
  "activity-line": "activityBorder",
  "activity-handle": "activityHandle",

  // ── Borders ───────────────────────────────────────────────────────────
  line: "border",
  "line-strong": "borderStrong",
  "line-muted": "borderMuted",

  // ── Text ──────────────────────────────────────────────────────────────
  ink: "text",
  "ink-secondary": "textSecondary",
  "ink-muted": "textMuted",
  "ink-disabled": "textDisabled",
  "ink-inverse": "textInverse",
  "activity-ink": "activityText",
  "activity-ink-secondary": "activityTextSecondary",
  "activity-ink-muted": "activityTextMuted",

  // ── Brand accent ──────────────────────────────────────────────────────
  accent: "accent",
  "accent-hover": "accentHover",
  "accent-pressed": "accentPressed",
  "accent-text": "accentText",
  "accent-soft": "accentSoft",
  "on-accent": "onAccent",

  // ── Status ────────────────────────────────────────────────────────────
  danger: "danger",
  "danger-hover": "dangerHover",
  "danger-pressed": "dangerPressed",
  "danger-text": "dangerText",
  "danger-soft": "dangerSoft",
  success: "success",
  "success-hover": "successHover",
  "success-pressed": "successPressed",
  "success-text": "successText",
  "success-soft": "successSoft",
  warning: "warning",
  "warning-hover": "warningHover",
  "warning-pressed": "warningPressed",
  "warning-text": "warningText",
  "warning-soft": "warningSoft",
  info: "info",
  "info-hover": "infoHover",
  "info-pressed": "infoPressed",
  "info-text": "infoText",
  "info-soft": "infoSoft",
  "purple-text": "purpleText",
  "purple-soft": "purpleSoft",

  // ── Interaction ───────────────────────────────────────────────────────
  overlay: "overlay",
  "focus-ring": "focusRing",
  "track-hover": "trackHover",
  "track-pressed": "trackPressed",

  // ── Charts ────────────────────────────────────────────────────────────
  "chart-line": "chartLine",
  "chart-fill": "chartFill",
  "chart-grid": "chartGrid",
  "chart-axis": "chartAxis",
  "chart-label": "chartLabel",
  "chart-crosshair": "chartCrosshair",
} as const satisfies Record<string, keyof typeof COLORS.light>

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // "class" rather than "media" so `useColorScheme().setColorScheme()` can
  // override the OS appearance. Onboarding leans on that to preview a theme
  // live while it is still being chosen. With nothing overriding it, the
  // resolved scheme still falls back to the system one, so nothing else moves.
  // The `.dark` custom properties below ride on the same root class.
  darkMode: "class",
  theme: {
    extend: {
      // `cardShadow` holds a whole `box-shadow` value, so it becomes a shadow
      // utility rather than a colour. The custom property it points at already
      // carries the light and dark variants, so `shadow-card` needs no `dark:`.
      boxShadow: { card: "var(--color-card-shadow)" },
      colors: {
        brand: BRAND_COLOR,

        // Exposes each themed token as a single class that follows the
        // resolved scheme: `bg-surface` reads the light value normally
        // and the dark value under `.dark`.
        ...Object.fromEntries(
          Object.entries(COLORS_THEMED).map(([name, token]) => [name, themeColor(token)]),
        ),
      },
    },
  },
  plugins: [
    ({ addBase }: { addBase: (styles: Record<string, object>) => void }) => {
      addBase({
        // `:root` carries the light palette and `.dark` overrides it, so a
        // themed class needs no variant of its own to switch schemes.
        ":root": variablesFor("light"),
        ".dark": variablesFor("dark"),
      })
    },
  ],
}
