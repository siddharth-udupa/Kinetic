import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

/*
 * One list of colour utility names, two ways of delivering it.
 *
 * `COLOR_UTILITIES` in `@repo/shared` is that list. `apps/mobile/tailwind.config.ts`
 * generates its colours from it; `apps/web/app/globals.css` cannot, because CSS
 * cannot import TypeScript. This script is what keeps that stylesheet honest — a
 * token with no `--color-*` line is a class that silently does not exist on web,
 * and NativeWind's silence for an unknown class looks exactly the same.
 *
 * Both files are read as text, against the shape they are written in. Reshape
 * either one and this reports a parse failure rather than a clean bill of
 * health, so it cannot pass by failing to look. Run it with `pnpm check:colors`.
 */

const MAP_FILE = "packages/shared/src/color-utilities.ts"
const CSS_FILE = "apps/web/app/globals.css"

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8")

/* Entries in the map are the only lines indented by exactly two spaces. */
const MAP_ENTRY = /^ {2}([a-zA-Z]+): "([a-z-]+)",$/gm
const CSS_ENTRY = /^ {2}--color-([a-z-]+): var\(--ob-([a-z-]+)\);$/gm

/**
 * `surfaceHover` → `surface-hover`, matching `toKebab` in `@repo/shared`. The token in
 * the map is camelCase; the CSS variable it reaches the DOM as is not.
 */
const kebab = (token) => token.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)

/** Keyed by class name, so it lines up with globals.css entry for entry. */
function readMap(text) {
  const entries = new Map()
  for (const [, token, name] of text.matchAll(MAP_ENTRY)) {
    entries.set(name, kebab(token))
  }
  return entries
}

function readCss(text) {
  const entries = new Map()
  for (const [, name, token] of text.matchAll(CSS_ENTRY)) {
    entries.set(name, token)
  }
  return entries
}

const cssSource = read(CSS_FILE)
const map = readMap(read(MAP_FILE))
const css = readCss(cssSource)

if (map.size === 0 || css.size === 0) {
  console.error(
    `Could not read the colour utilities.\n` +
      `  ${MAP_FILE}: ${map.size} entries\n` +
      `  ${CSS_FILE}: ${css.size} entries\n` +
      `One of these files has been reshaped. Update the regexes in this script to match.`,
  )
  process.exit(1)
}

const problems = []

for (const [name, token] of map) {
  const declared = css.get(name)
  if (declared === undefined) {
    problems.push(`${name}: in COLOR_UTILITIES, but no --color-${name} in globals.css`)
  } else if (declared !== token) {
    problems.push(`${name}: map says --ob-${token}, globals.css says --ob-${declared}`)
  }
}

for (const name of css.keys()) {
  if (!map.has(name)) {
    problems.push(`${name}: --color-${name} is in globals.css but not in COLOR_UTILITIES`)
  }
}

if (!cssSource.includes("--shadow-card: var(--ob-card-shadow);")) {
  problems.push("globals.css is missing `--shadow-card: var(--ob-card-shadow);`")
}

if (problems.length > 0) {
  console.error(`Colour utilities are out of sync (${problems.length}):\n`)
  for (const problem of problems) console.error(`  ${problem}`)
  console.error("")
  process.exit(1)
}

console.log(`${map.size} colour utilities match globals.css.`)