# AGENTS.md

Conventions for agents and contributors working in this repo.

## Colours live in one file

Every colour in the product is defined in **`packages/shared/src/colors.ts`**.
Both apps import from `@repo/shared`. Change a value there and every page that
reads it changes, on web and mobile together.

This is the rule that matters most, so it is the one to check first when writing
any UI:

- **Never write a hex, `rgb()`, `hsl()` or `color-mix()` literal in a
  component.** Not in a `style` prop, not in a className, not in a constant.
- **Never use a raw Tailwind palette class** — `bg-gray-100`, `dark:bg-slate-900`,
  `text-zinc-600`, `bg-[#FC5200]`, `ring-amber-500`. These bypass the palette
  entirely, which is exactly the drift the shared file exists to prevent.
- Use the named token utilities instead.

### Web (`apps/web`)

Prefer named utilities, which resolve to the active theme automatically:

```tsx
<div className="bg-surface border-line text-ink-muted" />
```

They are defined in `apps/web/app/globals.css` under `@theme inline` and map to
the `--ob-*` custom properties that the shell wrapper carries. Named ones worth
knowing: `page`, `surface`, `surface-muted`, `raised`, `line`, `line-strong`,
`ink`, `ink-secondary`, `ink-muted`, `accent`, `accent-text`, `accent-soft`,
`on-accent`, `danger`/`success`/`warning`/`info` (each with `-text` and `-soft`),
`overlay`, `focus-ring`, `chart-*`, and `brand`.

When you need the literal value rather than a class — an SVG attribute, a
Recharts prop, a native widget — read it off the theme:

```tsx
const { colors } = useOnboardingTheme()
<Stop stopColor={colors.accent} />
```

### Mobile (`apps/mobile`)

Use the same named utilities: `bg-surface`, `text-ink-muted`, `border-line`,
`bg-accent-soft`. They are wired to the shared tokens in
`apps/mobile/tailwind.config.ts` and follow the resolved scheme.

Native components (Ionicons, Skia, Reanimated) need a concrete colour, not a
class, so read it from the hook:

```tsx
const { colors } = useOnboardingTheme()
<Ionicons name="flash" size={20} color={colors.accent} />
```

### Adding a new colour

1. Add the key to `LIGHT_COLORS` in `packages/shared/src/colors.ts`, with a
   comment on any value whose choice is not self-evident.
2. Add the **same key** to `DARK_COLORS`. TypeScript enforces this — `DARK_COLORS`
   is typed `ColorTokens`, so a missing key fails to compile.
3. If it should be reachable as a class, add it to `@theme inline` in
   `apps/web/app/globals.css` and to `COLORS_THEMED` in
   `apps/mobile/tailwind.config.ts`.
4. Comment the value where the reasoning is not obvious — contrast ratios, why
   dark differs from light. The existing tokens are commented for a reason, and
   future readers depend on it.

Dark surfaces need a *lighter* lift where light ones go darker; elevation inverts
between the two themes. Read the neighbours of a token before picking a value.

## Naming

Tokens are `role` first, then state: `cardPressed`, `accentHover`, `lineStrong`.
Name a token after its role, not its hue — `cardPressed` survives a rebrand,
`pressedGrey` does not. Translucent tokens derive from their opaque base with
`withAlpha(...)` rather than a hand-typed `rgba()`, so changing `BRAND_COLOR`
carries them along.

## Brand constants

Product name, tagline and mark also live in the shared package, in
`packages/shared/src/brand.ts`. Import `APP_NAME` from `@repo/shared`, not from a
local `lib/brand` — those were removed, and a new copy is how the two apps drift
apart again.

## Other conventions

- **`packages/*` ship raw TypeScript.** Do not add a build step to a package.
- **`apps/mobile` targets Expo SDK 57.** Read
  `https://docs.expo.dev/versions/v57.0.0/` before writing mobile code; the SDK
  moves and the old patterns do not always still work.
- Biome runs `lint` only, not `format`. Existing files are 2-space with no
  trailing semicolons and no `biome format` pass, so match the surrounding code
  rather than running the formatter over a file you are editing.
- `ARCHITECTURE.md` documents the intended structure; `NAV-REDESIGN.md` and
  `ROADMAP.md` track work in progress. They can lag the code — prefer what is in
  the tree.
