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

### One name, three spellings

A token, the class you write, and the CSS variable behind it are the same word:

| Token (`colors.surface`) | Class (`bg-surface`) | Web variable | Mobile variable |
| --- | --- | --- | --- |
| `surface` | `surface` | `--ob-surface` | `--color-surface` |
| `line` | `line` | `--ob-line` | `--color-line` |
| `inkMuted` | `ink-muted` | `--ob-ink-muted` | `--color-ink-muted` |

The token is camelCase and everything else is its kebab-case form, so
`colors.accentSoft` and `bg-accent-soft` are one name. The full list is
`COLOR_UTILITIES` in `packages/shared/src/color-utilities.ts` — read it rather
than guessing.

The web and mobile variable columns hold the same value in two namespaces, on two
different platforms. The two apps deliver them differently on purpose: web
injects `--ob-*` as an inline style at runtime (React repaints on a theme change),
while NativeWind compiles classes at build time and so needs the values written
into the stylesheet as `--color-*`. That is why mobile cannot reuse the web path.

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
`purple-text`/`purple-soft`, `overlay`, `focus-ring`, `chart-*`, `shadow-card`.

The `activity-*` tier (`activity-page`, `activity-panel`, `activity-card`,
`activity-line`, `activity-handle`, and the `activity-ink*` text ramp) is for the
activity detail screen only. It stacks three surfaces where the rest of the app
stacks two, because it sits over a map and needs the extra step to read as depth.

When you need the literal value rather than a class — an SVG attribute, a
Recharts prop, a native widget — read it off the theme:

```tsx
const { colors } = useTheme()
<Stop stopColor={colors.accent} />
```

### Mobile (`apps/mobile`)

Use the same named utilities: `bg-surface`, `text-ink-muted`, `border-line`,
`bg-accent-soft`. They are wired to the shared tokens in `apps/mobile/theme.css`
and follow the resolved scheme, so a component writes `bg-surface` once rather
than a `bg-white dark:bg-slate-900` pair.

Mobile runs **Nativewind v5**, which is Tailwind v4. That changes four things
worth knowing before you touch the config:

- **Tailwind is CSS-first.** There is no `tailwind.config.ts`. Tokens live in
  `apps/mobile/theme.css`, which is **generated** — run `pnpm theme:mobile` after
  changing the palette, and never hand-edit it.
- **Dark mode is `Appearance`, not a class.** v5 rejects `darkMode: "class"` and
  qualified root selectors like `:root.dark` on native. `ThemeProvider`
  (wrapping the router in `app/_layout.tsx`) reads `useColorScheme()` and supplies
  the resolved palette through `VariableContextProvider`. To change the theme, call
  `useThemeScheme().setScheme(...)` — **not** `Appearance.setColorScheme`, which
  React Native Web does not implement at all.
- **The web build is statically rendered, so the provider waits one render.** The
  server cannot know the scheme and always emits the light palette, and React's
  hydration patches text but not attributes — a provider that rendered the resolved
  values on the first client render would keep the server's inline `style` forever.
  `ThemeProvider` therefore emits nothing until mounted, on web only. Native has no
  server pass and is correct from the first frame.
- **Every token must stay out of the compiler's inlining.** `metro.config.js`
  reads the token list out of `theme.css` and passes it as
  `inlineVariables.exclude`. Inlined, a token freezes at the light value that
  file declares; excluded, the stylesheet keeps the reference and the provider
  fills it in. A token missing from that list renders light in dark mode.

Opacity modifiers work on the opaque tokens (`bg-surface/90`,
`border-accent/30`) but not the translucent ones — `accent-soft`, the `-soft`
status fills, `overlay`, `focus-ring` and `track-*` already carry their own
alpha, and mobile emits those as a bare `var()`.

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

1. Add the key to `LIGHT_COLORS` in `packages/shared/src/colors.ts`, with a
   comment on any value whose choice is not self-evident.
2. Add the **same key** to `DARK_COLORS`. TypeScript enforces this — `DARK_COLORS`
   is typed `ColorTokens`, so a missing key fails to compile.
3. Add it to `COLOR_UTILITIES` in `packages/shared/src/color-utilities.ts`, mapping
   it to the class name you want to write. Also type-checked: the map is
   `satisfies Record<…>`, so a token with no entry there will not compile. This step
   is also what gives mobile the class.
4. Add the matching `--color-<name>: var(--ob-<token>);` line to `@theme inline` in
   `apps/web/app/globals.css`.
5. Add the token to the section it belongs to in `SECTIONS` in
   `scripts/generate-mobile-theme.mjs`, then run `pnpm theme:mobile`. The generator
   fails loudly on a palette token it has no section for, so step 5 cannot be
   forgotten silently.
6. Run `pnpm check:colors`. It compares all three targets — the utility map, the
   web stylesheet and the generated mobile theme — against the shared palette, so
   a mismatch anywhere cannot ship. It is a separate command from `pnpm lint`; run
   both.
7. Comment the value where the reasoning is not obvious — contrast ratios, why
   dark differs from light. The existing tokens are commented for a reason, and
   future readers depend on it.

Dark surfaces need a *lighter* lift where light ones go darker; elevation inverts
between the two themes. Read the neighbours of a token before picking a value.

## Naming

Tokens are `role` first, then state: `surfacePressed`, `accentHover`,
`lineStrong`. Name a token after its role, not its hue — `surfacePressed`
survives a rebrand, `pressedGrey` does not. Translucent tokens derive from their
opaque base with `withAlpha(...)` rather than a hand-typed `rgba()`, so changing
`BRAND_COLOR` carries them along.

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
