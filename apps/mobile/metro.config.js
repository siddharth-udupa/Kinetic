const { readFileSync } = require("node:fs")
const { join } = require("node:path")

const { getDefaultConfig } = require("expo/metro-config")
const { withNativewind } = require("nativewind/metro")

const config = getDefaultConfig(__dirname)

config.resolver.blockList = [
  /.*\/apps\/web\/\.next\/.*/,
  /.*\.next\/.*/,
]

/* Every token in `packages/shared/theme.css` is passed as `inlineVariables.exclude`; inlined, a token
 *  freezes at the light value. A token missing from the list renders light in dark mode. */
const themeSource = readFileSync(
  join(__dirname, "../../packages/shared/theme.css"),
  "utf8",
)

const inlineVariables = {
  exclude: [...new Set([...themeSource.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(([, name]) => name))],
}

module.exports = withNativewind(config, { inlineVariables })