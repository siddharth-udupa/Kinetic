import { getColors, type ThemeScheme } from "@repo/shared"

/**
 * The scheme handoff between the browser, the server and React.
 *
 * Deliberately not in `hooks/useTheme.tsx`: that module is `"use client"`, but the root
 * layout needs to call these from the server.
 *
 * The server cannot ask the OS what scheme the athlete is on, so a server component
 * renders light and the page visibly repaints dark once React hydrates. Two pieces
 * close that window:
 *
 *   1. `themeInitStyle` is a stylesheet, so the canvas is in the right scheme at first
 *      paint with nothing to execute.
 *   2. `themeInitScript` records the scheme in a cookie, which `readSchemeHint` reads
 *      back so every render after the first is right from the first byte of HTML.
 */

/** The hint the server reads back on the next request. */
export const THEME_COOKIE = "ob-theme"

/**
 * The scheme the *server* should render with, from the cookie's value.
 *
 * Best-effort by design: a missing, expired or hand-edited cookie falls back to
 * `"system"`, and the client corrects it during hydration either way. The cookie
 * only removes the light-to-dark repaint; it is not the source of truth.
 */
export function readSchemeHint(cookieValue: string | undefined): ThemeScheme {
  return cookieValue === "dark" || cookieValue === "light" || cookieValue === "system"
    ? cookieValue
    : "system"
}

/**
 * The pre-paint canvas colour, as a stylesheet.
 *
 * A stylesheet rather than a script because the script cannot set this without also
 * stamping `style` on `<html>` — a node React renders, which React then finds carrying
 * an attribute the server never emitted and reports as a hydration mismatch on every
 * load. A media query reaches the same pre-paint result while leaving the DOM alone.
 *
 * The literal values are inlined because this runs before the shell has published
 * `--color-*`, and it is the only thing on the page at that moment.
 */
export function themeInitStyle(): string {
  const { page: light } = getColors("light")
  const { page: dark } = getColors("dark")

  return `:root{color-scheme:light;background:${light}}@media (prefers-color-scheme: dark){:root{color-scheme:dark;background:${dark}}}`
}

/**
 * Records the resolved scheme in a cookie for the next request.
 *
 * Writes a cookie and nothing else. A cookie is invisible to React, so unlike setting
 * an attribute here this cannot cause a hydration mismatch. The one thing it must not
 * do is `document.documentElement.cookie`: `HTMLHtmlElement` carries a legacy `cookie`
 * alias that the spec defines as a no-op, so that assignment writes an expando onto the
 * element and leaves the cookie jar untouched — silently, with no error.
 */
export function themeInitScript(): string {
  return `(function(){try{var m=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.cookie=${JSON.stringify(`${THEME_COOKIE}=`)}+m+";path=/;max-age=31536000;samesite=lax"}catch(e){}})()`
}