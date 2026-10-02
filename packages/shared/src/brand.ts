/**
 * Product identity, in one place so the wordmark is defined once.
 *
 * The navbar, the page metadata, the tab bar and any future surface all read
 * the same strings, and renaming the product is a one-line change rather than a
 * sweep. Previously this was duplicated as `apps/web/lib/brand.ts` and
 * `apps/mobile/src/lib/brand.ts`, which meant the two apps could disagree about
 * what the product is called.
 *
 * Colours live alongside this in `./colors` — see that file for the palette.
 * Together they are everything about the product that is not behaviour.
 */
export const APP_NAME = "Kinetic"

export const APP_TAGLINE = "Run, ride and swim — logged in one place."

/**
 * The product mark: a bolt on a low-contrast accent plate.
 *
 * Deliberately the same construction as the icon plates in the onboarding flow
 * (`accentSoft` background, `accent` glyph) rather than a solid brand block, so
 * the navbar and the slides it links into read as one product.
 */
export const APP_MARK = "flash-outline" as const
