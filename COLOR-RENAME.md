# Colour token rename — deferred

**Status:** not started. Deliberately postponed; the cost/benefit was judged worse
than the other colour work, which has since been done.

## What this is

Right now a colour is named three times, and only one of them is short:

```
card  →  --ob-card  /  --color-card  →  bg-surface
```

`COLOR_UTILITIES` in `packages/shared/src/color-utilities.ts` now owns that mapping
in one place and `pnpm check:colors` keeps both apps honest against it, so the
third name is no longer a mystery. What remains is that the *token* name is still
the odd one out: `colors.card` next to `bg-surface` is two words for one thing.

This task renames the tokens to match the classes, leaving exactly one name to
learn. Nothing else changes — no value moves, no class name changes, no visual
difference.

## Why it is not done yet

| | |
| --- | --- |
| Tokens to rename | 19 of 67 |
| Call sites to rewrite | ~262 across ~55 files, both apps |
| Files to touch | `colors.ts`, both Tailwind configs, `globals.css`, `AGENTS.md`, `packages/shared/README.md`, and every component above |

Every one of those 262 sites is a mechanical rewrite that a human has to eyeball,
because a careless one compiles fine and renders the wrong colour. `colors.border`
sitting next to a className string full of the word `border` is exactly the kind of
thing a find-and-replace gets wrong quietly.

The value is real but it is a vocabulary improvement, not a bug fix. It should be
done in one sitting, not squeezed between other work.

## The 19 renames

Applied to `LIGHT_COLORS`, `DARK_COLORS`, and every `colors.<name>` call site.
Nothing outside this table changes.

| Current token | New token | Class (unchanged) |
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

`cardShadow` stays `cardShadow` — it is a box-shadow, not a colour, and already has
the shorter name `shadow-card`. `page`, `raised*`, `accent*`, `purple*`, `track*`,
`focusRing`, `overlay`, `chart*`, the status ramp and `onAccent` are all already
identical to their class names.

## How to do it

1. **Codemod, do not hand-edit.** One pass per rename, anchored on `colors\.`:

   ```
   colors\.textMuted\b   →  colors.inkMuted
   ```

   The `colors.` prefix plus `\b` is what makes it safe — `colors.text\b` does not
   match `colors.textMuted`, and `colors.border\b` never touches a className. Do
   not search for the bare token name; `border`, `text` and `card` appear all over
   these files as ordinary English and as Tailwind utilities.

2. **Update `colors.ts`.** Rename the keys in `LIGHT_COLORS` and `DARK_COLORS`, and
   fix any comment that names the old token.

3. **Update `COLOR_UTILITIES`.** Every *key* in the map changes to the new token.
   The values — the class names — do not.

4. **Update `globals.css`.** Mechanical: `--ob-card` → `--ob-surface` and so on.
   `pnpm check:colors` is the proof this landed correctly — it fails on any
   mismatch, so this step cannot be skipped or half-done.

5. **Update the docs.** The mapping table in `AGENTS.md` and the `Rules` section of
   `packages/shared/README.md`.

## The end state, and one decision

Once every token matches its class, `COLOR_UTILITIES` holds no information — it
becomes the identity map. Two options:

- **Delete it.** `tailwind.config.ts` derives its colour block straight from
  `Object.keys(COLORS.light)`, and `check-color-utilities.mjs` compares the token
  keys in `colors.ts` against the `--color-*` lines in `globals.css`. Fewer moving
  parts, one less file to keep in sync — but the exhaustiveness guarantee that
  `satisfies Record<…>` gives you today is gone, replaced by a regex.
- **Keep it.** Costs one file of pure ceremony, preserves the compile-time
  guarantee, and leaves room for the next token that wants a different class name.

Worth deciding when the rename lands, not now.

## Verify

```
pnpm check:colors                      # globals.css against COLOR_UTILITIES
pnpm lint                              # biome
pnpm --filter web exec tsc --noEmit
pnpm --filter mobile exec tsc --noEmit
pnpm --filter web build
```

Then diff against screenshots: web dashboard, activity detail, activity chart,
navbar; mobile dashboard, recorder, onboarding appearance slide. Every one should
be pixel-identical, because no value is changing. Anything that moves is a bad
rename.