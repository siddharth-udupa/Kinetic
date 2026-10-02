# `@repo/shared`

Cross-app constants. Ships raw TypeScript, like every other package here — there
is no build step (see `ARCHITECTURE.md`).

| Module | What it holds |
| --- | --- |
| `src/colors.ts` | The palette. Every colour in the product, per theme. |
| `src/brand.ts` | Product name, tagline, mark. |

## Colours

`colors.ts` is the single source of truth for colour on both platforms. Change a
value there and every surface that reads it moves — web and mobile together.

Two themes ship as complete, identically-keyed objects: `COLORS.light` and
`COLORS.dark`. `DARK_COLORS` is annotated `ColorTokens`, so a token added to one
theme and forgotten in the other is a compile error, not a colour that silently
falls back to light in dark mode.

```ts
import { getColors } from "@repo/shared"

const colors = getColors(isDark ? "dark" : "light")
<div style={{ backgroundColor: colors.card }} />
```

On the web, `colorsToCssVars(colors, isDark)` flattens a palette into the
`--ob-*` custom properties the shell wrapper carries, which is what lets a plain
Tailwind class like `bg-surface` resolve to the active theme. On mobile,
NativeWind needs literal values, so `apps/mobile/tailwind.config.ts` reads the
same objects at build time.

### Rules

- Name tokens `role` first, then state: `cardPressed`, not `pressedGrey`. A
  token named after its role survives a rebrand; one named after its hue does
  not.
- Adding a token means adding it to **both** themes, with a comment on any value
  whose choice is not obvious — contrast ratios, why it differs from its
  siblings.
- Translucent tokens derive from their opaque base via `withAlpha`, so a rebrand
  only has to change `BRAND_COLOR`. Never hand-type an `rgba()` of a base colour
  that exists elsewhere in the file.
- `packages/maps/src/styles/southIndia.ts` is deliberately excluded: those
  colours encode geography, not brand.
