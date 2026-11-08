"use client"

import Link from "next/link"
import { Route } from "lucide-react"
import MapView from "./Map"
import { useUserLocation } from "@/hooks/useUserLocation"

/** The map page asks for a precise fix on load; a refusal simply leaves the
 *  provider view and the layer controls as they were. */
export default function MapsScreen() {
  const { location } = useUserLocation({ requestOnMount: true })

  return (
    <main className="relative h-[calc(100dvh-var(--shell-header-h))] w-full">
      <MapView isChangeable userLocation={location} />

      {/* The loop builder is a separate screen, so give it an entry point that
          does not cover the map controls in either top corner. */}
      <Link
        href="/maps/route"
        className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-xl border border-line bg-surface/95 px-3.5 py-2.5 text-[12px] font-semibold text-ink shadow-card backdrop-blur-md transition hover:bg-surface active:opacity-80"
      >
        <Route size={15} strokeWidth={2} className="text-accent-text" aria-hidden />
        Plan a loop
      </Link>
    </main>
  )
}
