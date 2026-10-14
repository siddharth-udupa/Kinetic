/**
 * Generate `apps/mobile/theme.css` from the shared palette.
 *
 * Tailwind v4 declares its tokens in CSS, but the palette is TypeScript in
 * `@repo/shared` and is the source of truth for both apps. CSS cannot import
 * TypeScript, so this writes the mobile half of the bridge rather than leaving a
 * hand-maintained copy to drift.
 *
 * Only the light palette is written. Dark values are supplied at runtime by
 * `ThemeProvider` from `getColors("dark")`, because Nativewind v5 rejects the
 * `.dark` root-class selector v4 used to swap them.
 *
 * `pnpm check:colors` reads this file back and fails on any disagreement.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const OUT = new URL("../apps/mobile/theme.css", import.meta.url)

/**
 * Load `@repo/shared`'s palette into this script.
 *
 * The package ships raw TypeScript and Node here is built without type stripping,
 * so the two source files are transpiled to a temp directory and imported from
 * there. Compiling rather than parsing keeps the palette a single source of truth:
 * this script runs the same `LIGHT_COLORS` the apps run.
 */
async function loadPalette() {
  const dir = mkdtempSync(join(tmpdir(), "mobile-theme-"))
  const sources = ["colors", "color-utilities"]

  for (const name of sources) {
    const source = new URL(`../packages/shared/src/${name}.ts`, import.meta.url)
    const { outputText } = ts.transpileModule(readFileSync(source, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: `${name}.ts`,
    })
    writeFileSync(join(dir, `${name}.mjs`), outputText)
  }

  // `color-utilities` imports a type from `colors`; erased at compile time, but
  // the import specifier is not, so point it at the transpiled sibling.
  const colors = await import(pathToFileURL(join(dir, "colors.mjs")))
  const utilities = await import(pathToFileURL(join(dir, "color-utilities.mjs")))

  return { ...colors, ...utilities }
}

const { COLORS, toKebab } = await loadPalette()

/** Tailwind's value syntax, so a re-run produces a byte-identical file. */
function css(value) {
  const rgba = value.match(/^rgba?\(([^)]+)\)$/)
  if (rgba) {
    const [r, g, b, a] = rgba[1].split(",").map((part) => part.trim())
    return a === undefined ? `${r} ${g} ${b}` : `rgb(${r} ${g} ${b} / ${a})`
  }
  return value.toLowerCase()
}

const light = COLORS.light

/** Grouped as `colors.ts` groups them, so a diff points at the section that moved. */
const SECTIONS = [
  ["Surfaces", ["page", "surface", "surfaceHover", "surfacePressed", "surfaceMuted", "surfaceMutedHover", "surfaceMutedPressed", "raised", "raisedHover", "raisedPressed", "raisedBorder", "disabled"]],
  ["Activity detail", ["activityPage", "activityPanel", "activityCard", "activityLine", "activityHandle"]],
  ["Borders", ["line", "lineStrong", "lineMuted"]],
  ["Ink", ["ink", "inkSecondary", "inkMuted", "inkDisabled", "inkInverse", "activityInk", "activityInkSecondary", "activityInkMuted"]],
  ["Accent", ["accent", "accentHover", "accentPressed", "accentText", "accentSoft", "onAccent"]],
  ["Status", ["danger", "dangerHover", "dangerPressed", "dangerText", "dangerSoft", "success", "successHover", "successPressed", "successText", "successSoft", "warning", "warningHover", "warningPressed", "warningText", "warningSoft", "info", "infoHover", "infoPressed", "infoText", "infoSoft", "purpleText", "purpleSoft"]],
  ["Interaction", ["trackHover", "trackPressed", "focusRing", "overlay"]],
  ["Charts", ["chartLine", "chartFill", "chartGrid", "chartAxis", "chartLabel", "chartCrosshair"]],
]

const SHADOW_TOKEN = "cardShadow"

/*
 * The shadow's own variable, rather than writing the box-shadow into `@theme`.
 *
 * Tailwind substitutes a `@theme` value into the utility it generates, so a
 * literal shadow there is frozen at build time — and the compiler splits its
 * colour out into a `--tw-shadow-color` fallback, which `ThemeProvider` has no way
 * to reach. Pointing the token at a variable instead keeps the whole shadow
 * (geometry and alpha) swappable at runtime like every other token.
 */
const VALUE_VAR = "--shadow-card-value"

const varName = (token) => `--color-${toKebab(token)}`

/** Column width for the aligned blocks, from the longest name actually used. */
const WIDTH = Math.max(
  ...Object.keys(light).map((token) => (token === SHADOW_TOKEN ? VALUE_VAR : varName(token)).length),
) + 2

const pad = (name) => {
  if (name.length > WIDTH) throw new Error(`pad would truncate ${name}`)
  return name.padEnd(WIDTH, " ")
}

// A token in the palette but in no section would vanish from the output silently.
const listed = new Set(SECTIONS.flatMap(([, members]) => members))
const missing = Object.keys(light).filter((token) => !listed.has(token) && token !== SHADOW_TOKEN)
if (missing.length > 0) {
  console.error(`theme.css generator: tokens with no section: ${missing.join(", ")}`)
  process.exit(1)
}

function renderTheme() {
  const out = ["@theme {"]
  for (const [section, members] of SECTIONS) {
    out.push(`  /* ${section} */`)
    for (const token of members) out.push(`  ${pad(varName(token))}: ${css(light[token])};`)
    out.push("")
  }
  out.push("  /* Elevation */")
  out.push(`  --shadow-card: var(${VALUE_VAR});`)
  out.push("}")
  return out.join("\n")
}

function renderRoot() {
  const out = [":root {"]
  for (const [, members] of SECTIONS) {
    for (const token of members) out.push(`  ${pad(varName(token))}: ${css(light[token])};`)
  }
  out.push("")
  out.push("  /* Elevation */")
  out.push(`  ${pad(VALUE_VAR)}: ${css(light[SHADOW_TOKEN])};`)
  out.push("}")
  return out.join("\n")
}

const source = `/*
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/generate-mobile-theme.mjs\` from \`packages/shared/src/colors.ts\`.
 * Run \`pnpm theme:mobile\` after changing a colour or adding a token;
 * \`pnpm check:colors\` fails if this file and the shared palette disagree.
 *
 * Tailwind v4 is CSS-first, so a token must be declared in CSS before the class
 * (\`bg-surface\`) exists — but the palette is TypeScript, shared with the web app,
 * and CSS cannot import TypeScript. Hence a generated file.
 */
${renderTheme()}

/*
 * The same tokens as runtime variables.
 *
 * \`@theme\` values are compiled in, so a class would keep whatever is written above
 * regardless of the theme. Declaring them in \`:root\` too is what lets
 * \`ThemeProvider\` override any token at runtime, which is how one class name
 * (\`bg-surface\`) follows the resolved scheme without a \`dark:\` variant at every
 * call site.
 */
${renderRoot()}
`

writeFileSync(OUT, source)
console.log(`theme.css: ${Object.keys(light).length} tokens, light palette only.`)