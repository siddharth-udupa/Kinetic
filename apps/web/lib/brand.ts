/**
 * Product name and the one mark every surface reuses.
 *
 * Kept in a single module so the wordmark is defined once: the navbar, the page
 * metadata and any future surface all read the same string, and renaming the
 * product is a one-line change rather than a sweep.
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