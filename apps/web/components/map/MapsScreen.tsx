"use client"

import { useCallback, useRef, useState } from "react"
import { Crosshair, MapPin, Route } from "lucide-react"
import MapView from "./Map"
import RoutePlanner from "./RoutePlanner"
import { isApproximateFix, useUserLocation } from "@/hooks/useUserLocation"

/** The map page asks for a precise fix on load and owns the loop builder that
 *  floats over it, so opening the planner no longer navigates to a second map
 *  and both views always read the same fix. A refusal simply leaves the
 *  provider view and the layer controls as they were. A browser fix that lands
 *  in the wrong city can be corrected by tapping the map, because a desk-bound
 *  laptop often has no better answer than an IP guess. */
export default function MapsScreen({
  /** Open the loop builder as soon as the page lands, for the nav's shortcut. */
  openPlanner = false,
}: {
  openPlanner?: boolean
}) {
  const [encodedPolyline, setEncodedPolyline] = useState<string>()
  const [isPlannerOpen, setIsPlannerOpen] = useState(openPlanner)
  const [isPicking, setIsPicking] = useState(false)
  /* Whether a pick started from the planner, and should hand control back to it
     once the visitor has tapped (or cancelled). */
  const returnToPlannerRef = useRef(false)

  const { location, status, request, isManual, setManualLocation } =
    useUserLocation({ requestOnMount: true })

  /* A city-level guess is not a start point: it is usually an IP lookup rather
     than a Wi-Fi or GPS fix, and it can be hundreds of kilometres out. */
  const isApproximate = !isManual && isApproximateFix(location)

  const startPicking = useCallback((returnToPlanner: boolean) => {
    returnToPlannerRef.current = returnToPlanner
    setIsPicking(true)
    // The panel covers the map on a small screen, so it steps aside to pick.
    setIsPlannerOpen(false)
  }, [])

  const stopPicking = useCallback(() => {
    setIsPicking(false)
    if (!returnToPlannerRef.current) return
    returnToPlannerRef.current = false
    setIsPlannerOpen(true)
  }, [])

  const handlePickLocation = useCallback(
    (fix: { lat: number; lng: number }) => {
      setManualLocation(fix)
      stopPicking()
    },
    [setManualLocation, stopPicking],
  )

  return (
    <main className="relative h-[calc(100dvh-var(--shell-header-h))] w-full">
      <MapView
        encodedPolyline={encodedPolyline}
        isChangeable
        userLocation={location}
        isPicking={isPicking}
        onPickLocation={handlePickLocation}
      />

      {/* One strip for the three things the map needs to say about the start
          point: pick a new one, explain an approximate fix, or show that a
          chosen point is in force. */}
      {isPicking ? (
        <div
          role="status"
          className="absolute top-3 left-1/2 z-20 flex w-[calc(100%-6.5rem)] max-w-md -translate-x-1/2 items-center gap-2.5 rounded-xl border border-accent/30 bg-surface/95 px-3 py-2.5 shadow-card backdrop-blur-md"
        >
          <MapPin
            size={15}
            strokeWidth={2.2}
            className="shrink-0 text-accent-text"
            aria-hidden
          />
          <p className="min-w-0 flex-1 text-[12px] leading-4 font-medium text-ink">
            Tap the map where the loop should start.
          </p>
          <button
            type="button"
            onClick={stopPicking}
            className="shrink-0 cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-ink-secondary transition hover:bg-surface-muted active:opacity-80"
          >
            Cancel
          </button>
        </div>
      ) : isApproximate ? (
        <div
          role="status"
          className="absolute top-3 left-1/2 z-20 flex w-[calc(100%-6.5rem)] max-w-md -translate-x-1/2 items-center gap-2.5 rounded-xl border border-warning/30 bg-surface/95 px-3 py-2.5 shadow-card backdrop-blur-md"
        >
          <MapPin
            size={15}
            strokeWidth={2.2}
            className="shrink-0 text-warning"
            aria-hidden
          />
          <p className="min-w-0 flex-1 text-[11px] leading-4 text-ink-secondary">
            The browser only knows an approximate location
            {location?.accuracy
              ? ` (±${Math.max(1, Math.round(location.accuracy / 1_000))} km)`
              : ""}
            . Set your start point on the map.
          </p>
          <button
            type="button"
            onClick={() => startPicking(isPlannerOpen)}
            className="shrink-0 cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-accent-text transition hover:bg-surface-muted active:opacity-80"
          >
            Set on map
          </button>
        </div>
      ) : isManual ? (
        <div
          role="status"
          className="absolute top-3 left-1/2 z-20 flex w-[calc(100%-6.5rem)] max-w-md -translate-x-1/2 items-center gap-2.5 rounded-xl border border-line bg-surface/95 px-3 py-2 shadow-card backdrop-blur-md"
        >
          <MapPin
            size={14}
            strokeWidth={2.2}
            className="shrink-0 text-accent-text"
            aria-hidden
          />
          <p className="min-w-0 flex-1 text-[11px] leading-4 text-ink-secondary">
            Start point set on the map.
          </p>
          <button
            type="button"
            onClick={() => setManualLocation(null)}
            className="shrink-0 cursor-pointer text-[11px] font-semibold text-accent-text hover:underline"
          >
            Use browser location
          </button>
        </div>
      ) : null}

      {/* The loop builder floats over this map. Hide its entry point while it is
          open; the panel would otherwise sit on top of it on a small screen. */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
        {isPlannerOpen ? null : (
          <button
            type="button"
            onClick={() => setIsPlannerOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface/95 px-3.5 py-2.5 text-[12px] font-semibold text-ink shadow-card backdrop-blur-md transition hover:bg-surface active:opacity-80"
          >
            <Route
              size={15}
              strokeWidth={2}
              className="text-accent-text"
              aria-hidden
            />
            Plan a loop
          </button>
        )}

        {/* Always reachable: a browser fix can be confidently wrong, and the
            visitor needs a way to correct it without opening the planner. */}
        {isPicking ? null : (
          <button
            type="button"
            onClick={() => startPicking(false)}
            aria-label="Set your start location on the map"
            title="Set your start location"
            className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface/95 text-ink-secondary shadow-card backdrop-blur-md transition hover:bg-surface active:opacity-80"
          >
            <Crosshair size={16} strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>

      {isPlannerOpen ? (
        <RoutePlanner
          userLocation={location}
          locationStatus={status}
          isManualLocation={isManual}
          isApproximateLocation={isApproximate}
          onRequestLocation={request}
          onPickLocation={() => startPicking(true)}
          onClearManualLocation={() => setManualLocation(null)}
          onRouteChange={(route) => setEncodedPolyline(route?.polyline)}
          onClose={() => setIsPlannerOpen(false)}
        />
      ) : null}
    </main>
  )
}
