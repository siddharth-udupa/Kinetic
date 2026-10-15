# Colour token rename — done

**Status:** landed on `stabilization`. Every token now matches its class.

## What changed

A colour used to have three names and only one of them was short:

```
card  →  --ob-card  /  --color-card  →  bg-surface
```

They are now one word — the token is camelCase, the class and the CSS variable
are its kebab-case form:

```
surface  →  --color-surface  →  bg-surface
```

`colors.surface`, `bg-surface` and `--color-surface` are the same colour. No value
moved, no class name changed, no visual difference.

The 19 renames, applied to `LIGHT_COLORS`, `DARK_COLORS`,
`packages/shared/theme.css` and every `colors.<name>` call site across both apps:

| Was | Now | Class (unchanged) |
| --- | --- | --- |
| `card` | `surface` | `bg-surface` |
| `cardHover` | `surfaceHover` | `bg-surface-hover` |
| `cardPressed` | `surfacePressed` | `bg-surface-pressed` |
| `cardMuted` | `surfaceMuted` | `bg-surface-muted` |
| `cardMutedHover` | `surfaceMutedHover` | `bg-surface-muted-hover` |
| `cardMutedPressed` | `surfaceMutedPressed` | `bg-surface-muted-pressed` |
| `controlDisabled` | `disabled` | `bg-disabled` |
| `border` | `line` | `border-line` |
| `borderStrong` | `lineStrong` | `border-line-strong` |
| `borderMuted` | `lineMuted` | `border-line-muted` |
| `text` | `ink` | `text-ink` |
| `textSecondary` | `inkSecondary` | `text-ink-secondary` |
| `textMuted` | `inkMuted` | `text-ink-muted` |
| `textDisabled` | `inkDisabled` | `text-ink-disabled` |
| `textInverse` | `inkInverse` | `text-ink-inverse` |
| `activityBorder` | `activityLine` | `border-activity-line` |
| `activityText` | `activityInk` | `text-activity-ink` |
| `activityTextSecondary` | `activityInkSecondary` | `text-activity-ink-secondary` |
| `activityTextMuted` | `activityInkMuted` | `text-activity-ink-muted` |

`cardShadow` stayed `cardShadow` — it is a box-shadow, not a colour, and already
had the shorter class name `shadow-card`.

## The two traps, for anyone doing this again

`colors.border` sits next to a className string full of the word `border`, and
`colors.text` next to `text-[17px]`. Anchor every rewrite on `colors\.` with a
`\b` and go longest-token-first, or `colors.text` will eat `colors.textMuted`.
Searching for the bare token name is how this goes wrong quietly.

`getColors()` is not always destructured — `AppearanceSlide`'s `PreviewHalf`
aliases it to `p`, so `p.card` and `p.border` need rewriting by hand. `tsc` is
what catches that class of miss, so run it.

## COLOR_UTILITIES is gone

It became the identity map, carried no information, and existed only to keep a
generator and a checker script in step. `packages/shared/theme.css` is now the
palette, imported directly by both apps, so there is nothing to generate and
nothing to check. `scripts/generate-mobile-theme.mjs`,
`scripts/check-color-utilities.mjs` and the `pnpm theme:mobile` / `pnpm
check:colors` commands went with it.

## Verify

```
pnpm lint
pnpm --filter web exec tsc --noEmit
pnpm --filter mobile exec tsc --noEmit
pnpm --filter web build
```