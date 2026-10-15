import { getColors, type ThemeScheme } from "@repo/shared"

// Light/dark handoff: the server cannot read the OS scheme, so it renders light.
// themeInitStyle paints before first paint; themeInitScript stores the scheme in a cookie.

/** The hint the server reads back on the next request. */
export const THEME_COOKIE = "ob-theme"

/** The scheme the server should render with. Anything unknown falls back to "system". */
export function readSchemeHint(cookieValue: string | undefined): ThemeScheme {
  return cookieValue === "dark" || cookieValue === "light" || cookieValue === "system"
    ? cookieValue
    : "system"
}

/** Paints the canvas in the right scheme before React loads. A stylesheet, not
 *  a script: an inline style here would trip a hydration mismatch. */
export function themeInitStyle(): string {
  const { page: light } = getColors("light")
  const { page: dark } = getColors("dark")

  return `:root{color-scheme:light;background:${light}}@media (prefers-color-scheme: dark){:root{color-scheme:dark;background:${dark}}}`
}

/** Records the resolved scheme in a cookie for the next request. `document.cookie`
 *  only: `document.documentElement.cookie` sets an expando and leaves the jar alone. */
export function themeInitScript(): string {
  return `(function(){try{var m=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.cookie=${JSON.stringify(`${THEME_COOKIE}=`)}+m+";path=/;max-age=31536000;samesite=lax"}catch(e){}})()`
}