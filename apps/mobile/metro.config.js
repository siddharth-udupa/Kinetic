const { readFileSync } = require("node:fs")
const { join } = require("node:path")

const { getDefaultConfig } = require("expo/metro-config")
const { withNativewind } = require("nativewind/metro")

const config = getDefaultConfig(__dirname)

// Exclude Next.js build artifacts and web static files from Metro watcher
config.resolver.blockList = [
  /.*\/apps\/web\/\.next\/.*/,
  /.*\.next\/.*/,
]

/*
 * Every token in `theme.css` has to be excluded from compiler inlining.
 *
 * Inlined, a token is frozen at whatever the file declares — the light value.
 * Excluded, the stylesheet keeps the reference and `ThemeProvider` supplies the
 * resolved scheme at runtime, which is what lets `bg-surface` follow the theme
 * without a `dark:` variant at every call site. A token missed here renders light
 * in dark mode, so the list is read from the generated file rather than written
 * by hand: it cannot fall behind the palette the way a hand-kept list would.
 *
 * Read from the whole file rather than just `@theme`, because `--shadow-card-value`
 * is declared in `:root` — `@theme` only points `--shadow-card` at it.
 */
const themeSource = readFileSync(join(__dirname, "theme.css"), "utf8")

if (!/@theme\s*\{/.test(themeSource)) {
  throw new Error("theme.css has no @theme block; run `pnpm theme:mobile` to regenerate it")
}

const inlineVariables = {
  exclude: [...new Set([...themeSource.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(([, name]) => name))],
}

module.exports = withNativewind(config, { inlineVariables })