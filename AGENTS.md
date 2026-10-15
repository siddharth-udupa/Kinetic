# AGENTS.md

Conventions for agents and contributors working in this repo.

## Colours live in one file

Every colour in the product is defined in **`packages/shared/theme.css`**. Both
apps `@import` it directly — `apps/web/app/globals.css` and
`apps/mobile/global.css`. There is no generator and no second copy. Change a
value there and every page that reads it changes, on web and mobile together.

This is the rule that matters most, so it is the one to check first when writing
any UI:

- **Never write a hex, `rgb()`, `hsl()` or `color-mix()` literal in a
  component.** Not in a `style` prop, not in a className, not in a constant.
- **Never use a raw Tailwind palette class** — `bg-gray-100`, `dark:bg-slate-900`,
  `text-zinc-600`, `bg-[#FC5200]`, `ring-amber-500`. These bypass the palette
  entirely, which is exactly the drift the shared file exists to prevent.
- Use the named token utilities instead.

### One name

A token is one word in three places — the CSS variable, the Tailwind class and
the TypeScript key. The token is camelCase and the rest is its kebab-case form:

| Variable | Class | TypeScript |
| --- | --- | --- |
| `--color-surface` | `bg-surface` | `colors.surface` |
| `--color-line` | `border-line` | `colors.line` |
| `--color-ink-muted` | `text-ink-muted` | `colors.inkMuted` |

That file is the whole vocabulary; read it rather than guessing.

### Web (`apps/web`)

Prefer named utilities, which resolve to the active theme automatically:

```tsx
<div className="bg-surface border-line text-ink-muted" />
```

`@theme` registers them and carries the light values, so `bg-surface` compiles
to `var(--color-surface)`. Named ones worth knowing: `page`, `surface`,
`surface-muted`, `raised`, `line`, `line-strong`, `ink`, `ink-secondary`,
`ink-muted`, `accent`, `accent-text`, `accent-soft`, `on-accent`,
`danger`/`success`/`warning`/`info` (each with `-text` and `-soft`),
`purple-text`/`purple-soft`, `overlay`, `focus-ring`, `chart-*`, `shadow-card`.

The `activity-*` tier (`activity-page`, `activity-panel`, `activity-card`,
`activity-line`, `activity-handle`, and the `activity-ink*` text ramp) is for the
activity detail screen only. It stacks three surfaces where the rest of the app
stacks two, because it sits over a map and needs the extra step to read as depth.

The shell wrapper republishes the palette as inline `--color-*` custom
properties, which is what lets an explicit Light or Dark choice — and the
appearance slide's live preview — repaint without a recompile. An inline
property outranks the stylesheet, so it overrides the `prefers-color-scheme`
block underneath it.

When you need the literal value rather than a class — an SVG attribute, a
Recharts prop, a native widget — read it off the theme:

```tsx
const { colors } = useTheme()
<Stop stopColor={colors.accent} />
```

`colors` is the same tokens read as data, from `packages/shared/src/colors.ts`.
A native component cannot take a `var()` string, which is what those call sites
need it for.

### Mobile (`apps/mobile`)

Use the same named utilities: `bg-surface`, `text-ink-muted`, `border-line`,
`bg-accent-soft`. They are wired to the same shared tokens, so a component writes
`bg-surface` once rather than a `bg-white dark:bg-slate-900` pair.

Mobile runs **Nativewind v5**, which is Tailwind v4. That changes four things
worth knowing before you touch the config:

- **Tailwind is CSS-first.** There is no `tailwind.config.ts`. Tokens live in
  `packages/shared/theme.css`, which mobile imports like any other stylesheet.
- **Dark mode is `prefers-color-scheme`, not a class.** v5 rejects
  `darkMode: "class"` and qualified root selectors like `:root.dark` on native,
  which is why the dark half of the palette is a media query on `:root`. To
  change the theme, call `useThemeScheme().setScheme(...)` — on native that calls
  `Appearance.setColorScheme`, and **not** on React Native Web, which implements
  no setter at all, so the provider fills the values in through
  `VariableContextProvider` instead.
- **The web build is statically rendered, so the provider waits one render.** The
  server cannot know the scheme and always emits the light palette, and React's
  hydration patches text but not attributes — a provider that rendered the
  resolved values on the first client render would keep the server's inline
  `style` forever. `ThemeProvider` therefore emits nothing until mounted, on web
  only. Native has no server pass and is correct from the first frame.
- **Every token must stay out of the compiler's inlining.** `metro.config.js`
  reads the token list out of `packages/shared/theme.css` and passes it as
  `inlineVariables.exclude`. Inlined, a token freezes at the light value the
  stylesheet declares; excluded, the stylesheet keeps the reference and the
  `prefers-color-scheme` block decides. A token missing from that list renders
  light in dark mode.

Opacity modifiers work on the opaque tokens (`bg-surface/90`,
`border-accent/30`); the already-translucent ones (`accent-soft`, the `-soft`
status fills, `overlay`, `focus-ring`, `track-*`) carry their own alpha.

Native components (Ionicons, Skia, Reanimated) need a concrete colour, not a
class, so read it from the hook:

```tsx
const { colors } = useTheme()
<Ionicons name="flash" size={20} color={colors.accent} />
```

Third-party components that do not forward `className` need a `styled` wrapper —
v5 removed the global `cssInterop` registration:

```tsx
const Icon = styled(ExpoIonicons)
```

### Adding a new colour

1. Add `--color-<name>` to the `@theme` block in
   `packages/shared/theme.css`, and the same line to the dark `:root` block.
2. Add the camelCase key to **both** `LIGHT_COLORS` and `DARK_COLORS` in
   `packages/shared/src/colors.ts`. TypeScript enforces the second — `DARK_COLORS`
   is typed `ColorTokens`, so a missing key fails to compile.
3. Run `pnpm lint` and typecheck both apps.
4. Comment the value where the reasoning is not obvious — contrast ratios, why
   dark differs from light. The existing tokens are commented for a reason, and
   future readers depend on it.

Dark surfaces need a *lighter* lift where light ones go darker; elevation inverts
between the two themes. Read the neighbours of a token before picking a value.

## Naming

Tokens are `role` first, then state: `surfacePressed`, `accentHover`,
`lineStrong`. Name a token after its role, not its hue — `surfacePressed`
survives a rebrand, `pressedGrey` does not. A translucent token is written out as
its own `rgba()` value in both files, so change the two together.

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
  `ROADMAP.md` track work in progress. `COLOR-RENAME.md` is a scoped task waiting
  to be picked up. They can lag the code — prefer what is in the tree.