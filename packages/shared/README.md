# `@repo/shared`

Cross-app constants and the palette. Ships raw TypeScript, like every other
package here — there is no build step (see `ARCHITECTURE.md`).

| File | What it holds |
| --- | --- |
| `theme.css` | The palette. Every colour, light and dark, as Tailwind v4 tokens. |
| `src/colors.ts` | The same tokens as values, for the places a class cannot reach. |
| `src/brand.ts` | Product name, tagline, mark. |

## Colours

`theme.css` is the single source of truth for colour on both platforms. Both apps
`@import` it directly — `apps/web/app/globals.css` and `apps/mobile/global.css` —
so there is nothing to generate and nothing to keep in sync.

```css
@import "@repo/shared/theme.css";
```

`@theme` registers the utilities and carries the light values, so `bg-surface`
compiles to `var(--color-surface)`. The dark half is a
`@media (prefers-color-scheme: dark)` block overriding the same variables, which
is the only dark-mode mechanism Nativewind v5 accepts on native.

A token is one word in three places: the variable `--color-surface`, the class
`bg-surface`, and the camelCase key `colors.surface`.

### Reading a token as data

`src/colors.ts` is the same list as TypeScript. Use it where a `var()` string will
not do — an SVG attribute, a Recharts prop, a MapLibre paint property, an
Ionicons colour.

```ts
import { getColors } from "@repo/shared"

const colors = getColors(isDark ? "dark" : "light")
<Ionicons name="flash" color={colors.accent} />
```

Two schemes ship as complete, identically-keyed objects, `COLORS.light` and
`COLORS.dark`. `DARK_COLORS` is annotated `ColorTokens`, so a token added to one
and forgotten in the other fails to compile rather than silently falling back to
light in dark mode.

The two files hold the same values twice on purpose: CSS cannot import
TypeScript, and a native component cannot resolve a CSS variable into a colour
prop. Change a colour in both.

### Rules

- Name tokens `role` first, then state: `surfacePressed`, not `pressedGrey`. A
  token named after its role survives a rebrand; one named after its hue does
  not.
- Adding a token means adding it to both files, and to both schemes of
  `colors.ts`, with a comment on any value whose choice is not obvious — contrast
  ratios, why it differs from its siblings.
- `packages/maps/src/styles/southIndia.ts` is deliberately excluded: those
  colours encode geography, not brand.