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
 * Every custom property in the shared palette has to be excluded from compiler
 * inlining. Inlined, it is frozen at whatever `packages/shared/theme.css`
 * declares — the light value — so `bg-surface` would stay light in dark mode.
 * Excluded, the stylesheet keeps the reference and the `prefers-color-scheme`
 * block (or `ThemeProvider`) supplies the value at runtime.
 *
 * The list is read out of that file rather than written by hand, so it cannot
 * fall behind the palette.
 */
const themeSource = readFileSync(
  join(__dirname, "../../packages/shared/theme.css"),
  "utf8",
)

const inlineVariables = {
  exclude: [...new Set([...themeSource.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(([, name]) => name))],
}

module.exports = withNativewind(config, { inlineVariables })