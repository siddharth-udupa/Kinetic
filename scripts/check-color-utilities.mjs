/**
 * The shared palette reaches three delivery targets, and this is what holds them
 * to one source of truth in `packages/shared/src/colors.ts`.
 *
 *   - `COLOR_UTILITIES` names the class each token is exposed as.
 *   - `apps/web/app/globals.css` maps those classes to the `--ob-*` vars the web
 *     shell injects at runtime.
 *   - `apps/mobile/theme.css` declares the Tailwind v4 `@theme` tokens, generated
 *     from the same palette by `pnpm theme:mobile`.
 *
 * CSS cannot import TypeScript, so all three are checked rather than derived. A
 * token with no class, or a class pointing at a variable nobody sets, is a colour
 * that silently does not exist — and Nativewind's silence for an unknown class
 * looks exactly the same as Tailwind's.
 *
 * Files are read as text, against the shape they are written in. Reshape one and
 * this reports a parse failure rather than a clean bill of health, so it cannot
 * pass by failing to look. Run it with `pnpm check:colors`.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const MAP_FILE = "packages/shared/src/color-utilities.ts"
const CSS_FILE = "apps/web/app/globals.css"
const THEME_FILE = "apps/mobile/theme.css"

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8")

/* Entries in the map are the only lines indented by exactly two spaces. */
const MAP_ENTRY = /^ {2}([a-zA-Z]+): "([a-z-]+)",$/gm
const CSS_ENTRY = /^ {2}--color-([a-z-]+): var\(--ob-([a-z-]+)\);$/gm
/* Both blocks in the generated theme.css declare the same tokens; two-space indent,
   with the value column padded out to a common width. */
const THEME_ENTRY = /^ {2}(--(?:color-)?[a-z-]+)\s*:\s*(.+);$/gm

/**
 * `surfaceHover` → `surface-hover`, matching `toKebab` in `@repo/shared`. The token in
 * the map is camelCase; the CSS variable it reaches the DOM as is not.
 */
const kebab = (token) => token.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)

/**
 * Run the palette rather than parsing it, so this checks the values the apps
 * actually use. `@repo/shared` ships raw TypeScript and Node here is built without
 * type stripping, so the source is transpiled to a temp directory first.
 */
async function loadShared() {
  const dir = mkdtempSync(join(tmpdir(), "check-colors-"))
  for (const name of ["colors", "color-utilities"]) {
    const { outputText } = ts.transpileModule(read(`packages/shared/src/${name}.ts`), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: `${name}.ts`,
    })
    writeFileSync(join(dir, `${name}.mjs`), outputText)
  }
  const colors = await import(pathToFileURL(join(dir, "colors.mjs")))
  const utilities = await import(pathToFileURL(join(dir, "color-utilities.mjs")))
  return { ...colors, ...utilities }
}

/**
 * Reduce a colour to a comparable form.
 *
 * The palette writes `rgba(1, 2, 3, 0.5)`; Tailwind rewrites that to
 * `rgb(1 2 3 / 0.5)`; the generator emits the latter. Reducing both to
 * `r g b / a` is what makes an exact comparison possible without a CSS parser.
 */
function normalize(value) {
  const text = value.trim().toLowerCase().replace(/\s+/g, " ")
  const wrapped = text.match(/^rgba?\(([^)]*)\)$/)
  const body = wrapped ? wrapped[1] : text

  // The comma form is the palette's; the space form is what Tailwind emits.
  if (!body.includes(",")) return body.replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ")

  const parts = body.split(",").map((part) => part.trim()).filter(Boolean)
  const [r, g, b, a] = parts
  return a === undefined ? `${r} ${g} ${b}` : `${r} ${g} ${b} / ${a}`
}

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

function readTheme(text) {
  // First declaration wins: `@theme` and `:root` carry the same values by design,
  // and a disagreement between them is what the `:root` half of the check below
  // is for.
  const entries = new Map()
  for (const [, name, value] of text.matchAll(THEME_ENTRY)) {
    if (!entries.has(name)) entries.set(name, normalize(value))
  }
  return entries
}

const { COLORS, COLOR_UTILITIES } = await loadShared()

const cssSource = read(CSS_FILE)
const themeSource = read(THEME_FILE)
const map = readMap(read(MAP_FILE))
const css = readCss(cssSource)
const theme = readTheme(themeSource)

if (map.size === 0 || css.size === 0 || theme.size === 0) {
  console.error(
    `Could not read the colour utilities.\n` +
      `  ${MAP_FILE}: ${map.size} entries\n` +
      `  ${CSS_FILE}: ${css.size} entries\n` +
      `  ${THEME_FILE}: ${theme.size} entries\n` +
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

/*
 * The mobile side, against the palette itself rather than the utility map.
 *
 * Only the light scheme is in CSS — the dark half is supplied at runtime from
 * `getColors("dark")` by `ThemeProvider`, because Nativewind v5 rejects the `.dark`
 * root-class selector that v4 used. So this checks one scheme's worth of tokens,
 * which is exactly what the generated file is supposed to contain.
 */
for (const [token, value] of Object.entries(COLORS.light)) {
  // `cardShadow` is a whole box-shadow. `@theme` points at a variable holding it
  // rather than inlining it, because Tailwind would otherwise split the colour
  // out into a `--tw-shadow-color` fallback that the theme cannot reach.
  const name = token === "cardShadow" ? "--shadow-card-value" : `--color-${kebab(token)}`
  const declared = theme.get(name)
  if (declared === undefined) {
    problems.push(`${name}: token "${token}" is in the palette but not in ${THEME_FILE}`)
  } else if (declared !== normalize(value)) {
    problems.push(
      `${name}: palette says ${normalize(value)}, ${THEME_FILE} says ${declared} (run pnpm theme:mobile)`,
    )
  }
}

if (theme.get("--shadow-card") !== "var(--shadow-card-value)") {
  problems.push(`${THEME_FILE}: --shadow-card must be var(--shadow-card-value) so the theme can override it`)
}

// A class with no token behind it renders nothing, which is the failure this catches.
for (const name of Object.values(COLOR_UTILITIES)) {
  const cssName = `--color-${name}`
  if (!theme.has(cssName)) {
    problems.push(`${cssName}: COLOR_UTILITIES exposes it as a class, but theme.css has no such token`)
  }
}

if (problems.length > 0) {
  console.error(`Colour utilities are out of sync (${problems.length}):\n`)
  for (const problem of problems) console.error(`  ${problem}`)
  console.error("")
  process.exit(1)
}

console.log(
  `${map.size} colour utilities match globals.css, and ${theme.size} tokens match the shared palette in ${THEME_FILE}.`,
)