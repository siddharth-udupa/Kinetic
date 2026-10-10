import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/shell/Navbar";
import { AppShell } from "@/components/shell/AppShell";
import { readSchemeHint, THEME_COOKIE, themeInitScript, themeInitStyle } from "@/components/onboarding/theme-init";
import { APP_NAME, APP_TAGLINE } from "@repo/shared";
import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* The browser's answer to the theme question, recorded in a cookie by the script
     below. Without it every server component guesses light, and the page repaints dark
     only after React hydrates. */
  const schemeHint = readSchemeHint((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Paints the canvas in the athlete's scheme before first paint. A stylesheet
            rather than a script, so nothing here mutates a node React hydrates. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: build-time constant, no user input */}
        <style dangerouslySetInnerHTML={{ __html: themeInitStyle() }} />
        {/* Blocking on purpose: the job is to run before the first paint. Inlined because an
            extra request would land after the paint this exists to prevent — the value
            is a build-time constant, with no user input in it. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: build-time constant, no user input */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
    {/* `min-h-full`, not `h-full`: a definite height here makes the column clip
        any page taller than the viewport instead of letting the document scroll.
        Full-height pages take a viewport-based height of their own — see the
        onboarding flow and `app/maps`. */}
    <body className="flex min-h-full flex-col">
      {/* `AppShell` resolves the theme once for the whole column and publishes it
          as `--ob-*` custom properties, so the header and every page below it are
          drawn from one palette instead of each surface carrying its own greys. */}
      <AppShell scheme={schemeHint}>
        <Navbar />
        {children}
      </AppShell>
    </body>
    </html>
  );
}