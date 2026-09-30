import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Strava Clone",
  description: "Strava Clone Project",
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
      {/* `min-h-full`, not `h-full`: a definite height here makes the column
          clip any page taller than the viewport instead of letting the document
          scroll. Full-height pages take a viewport-based height of their own —
          see the onboarding flow and `app/maps`. */}
      <body className="flex min-h-full flex-col">
        <Navbar />
        {children}
        </body>
    </html>
  );
}
