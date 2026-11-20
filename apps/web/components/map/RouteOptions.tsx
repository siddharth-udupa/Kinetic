"use client"

import { Check } from "lucide-react"
import type { LoopRoute } from "@repo/validation"
import { formatDistance, formatDuration } from "./routeFormat"

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

type RouteOptionsProps = {
  routes: LoopRoute[]
  /** The route drawn at full strength. Falls back to the best one when unset. */
  activeRouteId?: string
  onSelect: (route: LoopRoute) => void
  className?: string
}

/** The alternative loops a single request returned, laid along the bottom of
 *  the map. Selecting one promotes it on the map; the other routes stay faint
 *  so the shape of the options is still legible. */
export default function RouteOptions({
  routes,
  activeRouteId,
  onSelect,
  className,
}: RouteOptionsProps) {
  if (routes.length === 0) return null

  return (
    <div className={className}>
      <fieldset className="pointer-events-auto m-0 min-w-0 max-w-full border-0 p-0">
        <legend className="sr-only">Route options</legend>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {routes.map((route, index) => {
            const isActive =
              activeRouteId === String(route.rank) ||
              (!activeRouteId && index === 0)

            return (
              <button
                key={route.rank}
                type="button"
                onClick={() => onSelect(route)}
                aria-pressed={isActive}
                aria-label={`Route ${route.rank}: ${formatDistance(
                  route.distanceMeters,
                )}, ${formatDuration(
                  route.durationSeconds,
                )}, ${route.elevationGainMeters} metres of climbing`}
                className={`flex w-36 shrink-0 cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2.5 text-left shadow-card backdrop-blur-md transition active:opacity-80 ${FOCUS} ${
                  isActive
                    ? "border-accent bg-surface ring-2 ring-accent/20"
                    : "border-line bg-surface/90 hover:bg-surface"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-semibold tracking-widest uppercase ${
                      isActive ? "text-accent-text" : "text-ink-muted"
                    }`}
                  >
                    {index === 0 ? "Best" : `Option ${index + 1}`}
                  </span>
                  {isActive ? (
                    <Check
                      size={12}
                      strokeWidth={3}
                      className="shrink-0 text-accent-text"
                      aria-hidden
                    />
                  ) : null}
                </span>

                <span className="text-[15px] leading-none font-bold text-ink tabular-nums">
                  {formatDistance(route.distanceMeters)}
                </span>

                <span className="text-[11px] text-ink-secondary tabular-nums">
                  {formatDuration(route.durationSeconds)} ·{" "}
                  {route.elevationGainMeters} m
                </span>

                <span className="text-[10px] text-ink-muted tabular-nums">
                  {(route.accuracy * 100).toFixed(1)}% from target
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
