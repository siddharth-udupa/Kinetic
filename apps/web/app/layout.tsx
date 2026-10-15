import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/shell/Navbar";
import { AppShell } from "@/components/shell/AppShell";
import { readSchemeHint, THEME_COOKIE, themeInitScript, themeInitStyle } from "@/lib/theme-init";
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
  /* The browser's answer to the theme question, stored in a cookie by the script
     below. Without it every server render guesses light. */
  const schemeHint = readSchemeHint((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Paints the canvas in the right scheme before first paint. A stylesheet, so
            nothing here mutates a node React hydrates. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: build-time constant, no user input */}
        <style dangerouslySetInnerHTML={{ __html: themeInitStyle() }} />
        {/* Blocking on purpose: it has to run before first paint, so it cannot wait
            on a request. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: build-time constant, no user input */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
    {/* `min-h-full`, not `h-full`: a definite height clips any page taller than the
        viewport. Full-height pages take a viewport-based height of their own. */}
    <body className="flex min-h-full flex-col">
      {/* `AppShell` resolves the theme once and publishes it as `--color-*`, so the
          header and every page below draw from one palette. */}
      <AppShell scheme={schemeHint}>
        <Navbar />
        {children}
      </AppShell>
    </body>
    </html>
  );
}