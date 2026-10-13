const { COLOR_UTILITIES, COLORS, toChannels, toKebab } = require("@repo/shared") as typeof import("@repo/shared")

/*
 * Shared colours → NativeWind utilities.
 *
 * The tokens live in `packages/shared/src/colors.ts`; the class names they are
 * exposed as live in `packages/shared/src/color-utilities.ts`. This file is the
 * only bridge between them and the mobile app.
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
 * The utility list is not written out here — `COLOR_UTILITIES` in `@repo/shared`
 * is the only copy of it, and the web app's `globals.css` is checked against that
 * same map by `pnpm check:colors`.
 */

/** `surfaceMuted` → `--color-surface-muted`. */
function varName(token: string): string {
  return `--color-${toKebab(token)}`
}

const HEX_ONLY = /^#[0-9a-f]{6}$/i
const isOpaque = (value: string) => HEX_ONLY.test(value)

type ColorToken = keyof typeof COLORS.light

const tokens = Object.keys(COLORS.light) as ColorToken[]

/**
 * Tokens opaque in both themes: referenced as channels so `/opacity` works.
 *
 * The check is on both themes on purpose. A token that is a hex in light but an
 * `rgba()` in dark cannot be referenced the same way in both, so it falls
 * through to the other branch and simply loses opacity modifiers.
 *
 * A Set rather than an array because `themeColor` is reached with a plain string
 * from the utility map, which is not narrow enough to index `COLORS` with.
 */
const opaqueTokens = new Set<string>(
  tokens.filter((token) => isOpaque(COLORS.light[token]) && isOpaque(COLORS.dark[token])),
)

/** The custom properties for one scheme, split by how each kind is referenced. */
function variablesFor(scheme: "light" | "dark") {
  const palette = COLORS[scheme]
  return Object.fromEntries(
    tokens.map((token) => [
      varName(token),
      opaqueTokens.has(token) ? toChannels(palette[token]) : palette[token],
    ]),
  )
}

/** Every shared token, in the form Tailwind expects to build utilities from. */
function themeColor(token: string) {
  return opaqueTokens.has(token)
    ? `rgb(var(${varName(token)}) / <alpha-value>)`
    : `var(${varName(token)})`
}

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
      // utility rather than a colour — which is why it is the one token absent
      // from `COLOR_UTILITIES`. The custom property it points at already
      // carries the light and dark variants, so `shadow-card` needs no `dark:`.
      boxShadow: { card: "var(--color-card-shadow)" },
      colors: {
        /*
         * Every themed token as a single class that follows the resolved scheme:
         * `bg-surface` reads the light value normally and the dark value under
         * `.dark`.
         *
         * Where a class will not do — Ionicons, Skia, Reanimated — reach for the
         * palette directly instead: `useTheme().colors.accent` returns the
         * resolved value for the active scheme.
         */
        ...Object.fromEntries(
          Object.entries(COLOR_UTILITIES).map(([token, name]) => [name, themeColor(token)]),
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