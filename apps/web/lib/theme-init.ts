import { getColors, type ThemeScheme } from "@repo/shared"

// Light/dark handoff. themeInitStyle paints the canvas before first paint; the
// cookie carries one thing only — an *explicit* Light or Dark choice — so the
// server paints the same palette on the next request.
//
// There is deliberately no hint for "follow the system". `theme.css` already
// darkens `:root` under `prefers-color-scheme`, so that case needs nothing from
// the server; a script recording the resolved scheme used to overwrite the
// visitor's choice on every page load, and could only reach the server on the
// load after next.

/** An explicit choice. No cookie means "follow the system". */
export const THEME_COOKIE = "ob-theme"

/** What the server should paint. Anything but a named choice means the system. */
export function readSchemeHint(cookieValue: string | undefined): ThemeScheme {
  return cookieValue === "dark" || cookieValue === "light" ? cookieValue : "system"
}

/** Records a choice the app just made, so the next request starts from it. Called
 *  on the way out of `setScheme`, never on mount: mounting re-states a choice the
 *  server already sent. */
export function writeSchemeHint(scheme: ThemeScheme) {
  if (typeof document === "undefined") return
  // The Cookie Store API is not an option: it only touches cookies the server has
  // already set, and this has to be one synchronous line to fire and forget.
  // biome-ignore lint/suspicious/noDocumentCookie: see above
  document.cookie = `${THEME_COOKIE}=${scheme};path=/;max-age=31536000;samesite=lax`
}

/** Paints the canvas in the right scheme before React loads. A stylesheet, not
 *  a script: an inline style here would trip a hydration mismatch. */
export function themeInitStyle(): string {
  const { page: light } = getColors("light")
  const { page: dark } = getColors("dark")

  return `:root{color-scheme:light;background:${light}}@media (prefers-color-scheme: dark){:root{color-scheme:dark;background:${dark}}}`
}
