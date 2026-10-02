import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/shell/Navbar";
import { AppShell } from "@/components/shell/AppShell";
import { APP_NAME, APP_TAGLINE } from "@repo/shared";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
    {/* `min-h-full`, not `h-full`: a definite height here makes the column clip
        any page taller than the viewport instead of letting the document scroll.
        Full-height pages take a viewport-based height of their own — see the
        onboarding flow and `app/maps`. */}
    <body className="flex min-h-full flex-col">
      {/* `AppShell` resolves the theme once for the whole column and publishes it
          as `--ob-*` custom properties, so the header and every page below it are
          drawn from one palette instead of each surface carrying its own greys. */}
      <AppShell>
        <Navbar />
        {children}
      </AppShell>
    </body>
    </html>
  );
}