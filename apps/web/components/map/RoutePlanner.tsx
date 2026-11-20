"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  Bike,
  CheckCircle2,
  Compass,
  Dices,
  Footprints,
  Layers,
  Loader2,
  Map as MapIcon,
  MapPin,
  Mountain,
  Route,
  SlidersHorizontal,
  Sparkles,
  Trees,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react"
import type {
  LoopRequest,
  LoopResponse,
  RouteProfile,
} from "@repo/validation"
import type { LocationStatus, UserLocation } from "@/hooks/useUserLocation"
import { formatDistance, formatDuration } from "./routeFormat"

const MIN_DISTANCE_KM = 2
const MAX_DISTANCE_KM = 50
const MAX_SEED = 4_294_967_295

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

const PROFILE_OPTIONS: {
  value: RouteProfile
  label: string
  hint: string
  icon: LucideIcon
}[] = [
  { value: "bike", label: "Bike", hint: "Road or hybrid", icon: Bike },
  { value: "foot", label: "Walk", hint: "On foot", icon: Footprints },
]

const UNAVAILABLE_PREFERENCES: {
  label: string
  icon: LucideIcon
  options: string[]
}[] = [
  { label: "Hills", icon: Mountain, options: ["Flat", "Rolling", "Hilly"] },
  { label: "Surface", icon: Layers, options: ["Paved", "Mixed", "Gravel"] },
  {
    label: "Roads",
    icon: SlidersHorizontal,
    options: ["Quiet", "Balanced", "Busy"],
  },
  { label: "Loop shape", icon: Route, options: ["Rounder", "Direct"] },
  { label: "Scenery", icon: Trees, options: ["Parks", "Water", "Open"] },
  { label: "Avoid areas", icon: Compass, options: ["Draw a zone"] },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function errorOf(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined
  return typeof payload.error === "string" ? payload.error : undefined
}

function locationNotice(status: LocationStatus): {
  hint: string
  warning?: string
} {
  switch (status) {
    case "requesting":
      return { hint: "Getting a precise fix…" }
    case "manual":
      return { hint: "Using the start point you set on the map." }
    case "denied":
      return {
        hint: "Location access is blocked.",
        warning:
          "Allow location access for this site in your browser settings and retry, or set the start point on the map.",
      }
    case "timeout":
      return {
        hint: "Your location is taking too long.",
        warning:
          "No precise fix arrived in time. Check your signal and retry, or set the start point on the map.",
      }
    case "unavailable":
      return {
        hint: "Your location is unavailable.",
        warning:
          "Turn on location services and retry, or set the start point on the map.",
      }
    case "unsupported":
      return {
        hint: "This browser cannot share your location.",
        warning:
          "Set the start point on the map to build a loop without location access.",
      }
    case "granted":
      return { hint: "Reading your position…" }
    case "idle":
      return {
        hint: "Location access is needed to choose the start point.",
      }
  }
}

type RoutePlannerProps = {
  /** The start point: a chosen map point, the browser's fix, or null. */
  userLocation: UserLocation | null
  locationStatus: LocationStatus
  /** True when the point came from the map, not the browser. */
  isManualLocation: boolean
  /** True when the browser's fix is only city-level and worth correcting. */
  isApproximateLocation: boolean
  /** Prompts for permission, or retries after a refusal. */
  onRequestLocation: () => Promise<UserLocation | null>
  /** Hands control to the map so the visitor can tap a start point. */
  onPickLocation: () => void
  /** Drops a chosen point and goes back to the browser's fix. */
  onClearManualLocation: () => void
  /** The new loop, or null while a request is in flight. */
  onRouteChange?: (route: LoopResponse | null) => void
  /** Dismisses the panel floating over the map. */
  onClose: () => void
}

export default function RoutePlanner({
  userLocation,
  locationStatus,
  isManualLocation,
  isApproximateLocation,
  onRequestLocation,
  onPickLocation,
  onClearManualLocation,
  onRouteChange,
  onClose,
}: RoutePlannerProps) {
  const [distanceKm, setDistanceKm] = useState(10)
  const [profile, setProfile] = useState<RouteProfile>("bike")
  const [seed, setSeed] = useState("")

  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const hasFocusedRef = useRef(false)

  const [status, setStatus] = useState<
    "idle" | "locating" | "loading" | "success" | "error"
  >("idle")
  const [result, setResult] = useState<LoopResponse | null>(null)
  const [error, setError] = useState<{
    message: string
    needsSignIn: boolean
    needsLocation?: boolean
  } | null>(null)

  const notice = locationNotice(locationStatus)

  /* A popup should take focus, and Escape should dismiss it like any other
     dialog. Focus once: the parent may pass a new inline callback on a render. */
  useEffect(() => {
    if (hasFocusedRef.current) return
    hasFocusedRef.current = true
    closeButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  function randomizeSeed() {
    setSeed(String(Math.floor(Math.random() * (MAX_SEED + 1))))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === "loading" || status === "locating") return

    const trimmedSeed = seed.trim()
    const seedValue =
      trimmedSeed === "" ? undefined : Number(trimmedSeed)

    if (
      seedValue !== undefined &&
      (!Number.isInteger(seedValue) ||
        seedValue < 0 ||
        seedValue > MAX_SEED)
    ) {
      setStatus("error")
      setResult(null)
      onRouteChange?.(null)
      setError({
        message: `Seed must be a whole number between 0 and ${MAX_SEED.toLocaleString()}.`,
        needsSignIn: false,
      })
      return
    }

    /* The loop is anchored to the athlete, so a request without a fix waits
       for the permission prompt instead of falling back to a fixed city. */
    let origin = userLocation

    if (!origin) {
      setStatus("locating")
      setError(null)
      origin = await onRequestLocation()

      if (!origin) {
        setStatus("error")
        setResult(null)
        onRouteChange?.(null)
        setError({
          message:
            "Location access is required to build a loop. Allow this site to use your precise location, then try again.",
          needsSignIn: false,
          needsLocation: true,
        })
        return
      }
    }

    const payload: LoopRequest = {
      origin: { lat: origin.lat, lon: origin.lng },
      distanceMeters: distanceKm * 1_000,
      profile,
      ...(seedValue === undefined ? {} : { seed: seedValue }),
    }

    setStatus("loading")
    setResult(null)
    setError(null)
    onRouteChange?.(null)

    try {
      const response = await fetch("/api/routes/loop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })

      const body: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        setStatus("error")
        setError({
          message:
            errorOf(body) ?? `The route request failed (${response.status}).`,
          needsSignIn: response.status === 401,
        })
        return
      }

      const route = body as LoopResponse
      setResult(route)
      setStatus("success")
      onRouteChange?.(route)
    } catch {
      setStatus("error")
      setError({
        message:
          "Could not reach the route engine. Check that it is running, then try again.",
        needsSignIn: false,
      })
    }
  }

  /** A retry after a refusal should clear the stale location error, not stack
   *  another one on top of it. Other errors belong to their own attempt. */
  async function retryLocation() {
    if (error?.needsLocation) {
      setError(null)
      setStatus("idle")
    }
    await onRequestLocation()
  }

  return (
    <aside
      className="absolute inset-x-3 bottom-3 z-10 max-h-[68%] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface/95 p-5 shadow-card backdrop-blur-md sm:inset-y-4 sm:right-auto sm:left-4 sm:max-h-none sm:w-97.5 sm:p-6"
      aria-labelledby="loop-planner-title"
      role="dialog"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-widest text-accent-text uppercase">
            Route builder
          </p>
          <h1
            id="loop-planner-title"
            className="mt-1 text-[22px] font-bold tracking-tight text-ink"
          >
            Plan a loop
          </h1>
          <p className="mt-1.5 text-[12px] leading-5 text-ink-secondary">
            Pick a distance and an activity. The loop starts and finishes at
            your start point.
          </p>
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close route builder"
          className={`-mt-1 -mr-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink active:opacity-70 ${FOCUS}`}
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </header>

      <div className="mt-4 rounded-xl border border-line bg-surface-muted px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-accent-text">
            <MapPin size={15} strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-ink">
              {isManualLocation
                ? "Starting at your chosen point"
                : isApproximateLocation
                  ? "Approximate location"
                  : userLocation
                    ? "Starting at your precise location"
                    : "Start point needs location"}
            </p>
            <p className="text-[11px] text-ink-muted tabular-nums">
              {userLocation
                ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}${
                    userLocation.accuracy !== null
                      ? ` · ±${Math.round(userLocation.accuracy)} m`
                      : ""
                  }`
                : notice.hint}
            </p>
          </div>
          {!userLocation && locationStatus !== "requesting" ? (
            <button
              type="button"
              onClick={() => void retryLocation()}
              className={`shrink-0 cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-accent-text transition hover:bg-surface-muted active:opacity-80 ${FOCUS}`}
            >
              {locationStatus === "denied" ? "Retry" : "Allow"}
            </button>
          ) : null}
        </div>

        {/* A browser fix can be a network guess, and a refusal leaves no point
            at all, so the start point is always placeable by hand. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {isManualLocation ? (
            <button
              type="button"
              onClick={onClearManualLocation}
              className="cursor-pointer text-[11px] font-semibold text-accent-text hover:underline"
            >
              Use browser location
            </button>
          ) : (
            <button
              type="button"
              onClick={onPickLocation}
              className="cursor-pointer text-[11px] font-semibold text-accent-text hover:underline"
            >
              Set the start point on the map
            </button>
          )}
        </div>

        {isApproximateLocation && !isManualLocation ? (
          <p className="mt-1.5 text-[11px] leading-4 text-warning-text">
            The browser only has a network estimate for this device. Set the
            start point on the map for an exact loop.
          </p>
        ) : null}

        {notice.warning ? (
          <div
            role="alert"
            className="mt-2 flex items-start gap-1.5 rounded-lg border border-warning/30 bg-warning-soft px-2.5 py-2"
          >
            <AlertTriangle
              size={13}
              strokeWidth={2.4}
              className="mt-0.5 shrink-0 text-warning"
              aria-hidden
            />
            <p className="text-[11px] leading-4 text-warning-text">
              {notice.warning}
            </p>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <label
              htmlFor="loop-distance"
              className="text-[12px] font-semibold text-ink-secondary"
            >
              Distance
            </label>
            <span className="text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
              Target
            </span>
          </div>

          <div className="flex items-end justify-between gap-3">
            <output
              htmlFor="loop-distance"
              className="text-[30px] leading-none font-bold text-ink tabular-nums"
            >
              {distanceKm}
              <span className="ml-1 text-[14px] font-semibold text-ink-muted">
                km
              </span>
            </output>
            <span className="text-[11px] text-ink-muted">
              {profile === "bike" ? "Bike loop" : "Walking loop"}
            </span>
          </div>

          <input
            id="loop-distance"
            type="range"
            min={MIN_DISTANCE_KM}
            max={MAX_DISTANCE_KM}
            step={1}
            value={distanceKm}
            onChange={(event) => setDistanceKm(Number(event.target.value))}
            aria-valuetext={`${distanceKm} kilometres`}
            className={`mt-3 h-2 w-full cursor-pointer ${FOCUS}`}
            style={{ accentColor: "var(--color-accent)" }}
          />

          <div className="mt-1 flex justify-between text-[10px] text-ink-disabled">
            <span>{MIN_DISTANCE_KM} km</span>
            <span>{MAX_DISTANCE_KM} km</span>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-[12px] font-semibold text-ink-secondary">
            Activity
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {PROFILE_OPTIONS.map((option) => {
              const Icon = option.icon
              const selected = profile === option.value

              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-3 text-left transition active:opacity-80 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${
                    selected
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-surface hover:bg-surface-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="loop-profile"
                    value={option.value}
                    checked={selected}
                    onChange={() => setProfile(option.value)}
                    className="sr-only"
                  />
                  <Icon
                    size={18}
                    strokeWidth={2}
                    className={
                      selected ? "text-accent-text" : "text-ink-muted"
                    }
                    aria-hidden
                  />
                  <span>
                    <span
                      className={`block text-[13px] font-semibold ${
                        selected ? "text-accent-text" : "text-ink"
                      }`}
                    >
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-ink-muted">
                      {option.hint}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-5">
          <label
            htmlFor="loop-seed"
            className="text-[12px] font-semibold text-ink-secondary"
          >
            Seed{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="loop-seed"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_SEED}
              step={1}
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              placeholder="Auto"
              className={`h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[13px] text-ink transition placeholder:text-ink-muted focus:border-accent focus:outline-none ${FOCUS}`}
            />
            <button
              type="button"
              onClick={randomizeSeed}
              aria-label="Generate a random seed"
              title="Random seed"
              className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-ink-secondary transition hover:bg-surface-muted active:opacity-70 ${FOCUS}`}
            >
              <Dices size={17} strokeWidth={2} aria-hidden />
            </button>
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-ink-muted">
            Same seed and preferences rebuild the same loop.
          </p>
        </div>

        <button
          type="submit"
          disabled={status === "loading" || status === "locating"}
          aria-busy={
            status === "loading" || status === "locating" || undefined
          }
          className={`mt-5 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-on-accent transition hover:bg-accent-hover active:bg-accent-pressed disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
        >
          {status === "loading" || status === "locating" ? (
            <Loader2 size={17} strokeWidth={2.4} className="animate-spin" aria-hidden />
          ) : (
            <Sparkles size={17} strokeWidth={2.4} aria-hidden />
          )}
          {status === "locating"
            ? "Finding your location…"
            : status === "loading"
              ? "Building your loop…"
              : "Generate loop"}
        </button>

        <div aria-live="polite">
          {status === "success" && result ? (
            <div className="mt-3 rounded-xl border border-success/30 bg-success-soft px-3.5 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={15}
                  strokeWidth={2.4}
                  className="text-success"
                  aria-hidden
                />
                <p className="text-[12px] font-semibold text-success-text">
                  {result.routes.length > 1
                    ? `${result.routes.length} loops generated`
                    : "Loop generated"}
                </p>
              </div>
              <p className="mt-1.5 text-[12px] text-ink-secondary">
                {formatDistance(result.distanceMeters)} ·{" "}
                {formatDuration(result.durationSeconds)} ·{" "}
                {result.elevationGainMeters} m climb
              </p>
              <p className="mt-1 text-[11px] leading-4 text-ink-muted">
                Seed {result.seed} ·{" "}
                {(result.accuracy * 100).toFixed(1)}% from target.
              </p>
              {result.routes.length > 1 ? (
                <p className="mt-1 text-[11px] leading-4 text-ink-muted">
                  Pick a route card on the map to highlight a different loop.
                </p>
              ) : null}
              {result.warnings.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {result.warnings.map((warning) => (
                    <li
                      key={warning}
                      className="text-[11px] leading-4 text-warning-text"
                    >
                      {warning}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {status === "error" && error ? (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3"
            >
              <div className="flex items-start gap-2">
                <AlertCircle
                  size={15}
                  strokeWidth={2.4}
                  className="mt-0.5 shrink-0 text-danger"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-danger-text">
                    {error.needsLocation
                      ? "Location required"
                      : "Could not build the loop"}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-ink-secondary">
                    {error.message}
                  </p>
                  {error.needsLocation ? (
                    <button
                      type="button"
                      onClick={() => void retryLocation()}
                      className="mt-1.5 inline-block cursor-pointer text-[11px] font-semibold text-accent-text hover:underline"
                    >
                      Try location again
                    </button>
                  ) : null}
                  {error.needsSignIn ? (
                    <Link
                      href="/auth?callbackUrl=/maps"
                      className="mt-1.5 inline-block text-[11px] font-semibold text-accent-text hover:underline"
                    >
                      Sign in to generate a loop
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </form>

      <fieldset disabled className="mt-6 min-w-0 border-0 p-0">
        <legend className="sr-only">
          Preferences not available in this version
        </legend>

        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase">
            Not available yet
          </p>
          <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-ink-disabled">
            Soon
          </span>
        </div>

        <div className="space-y-1.5">
          {UNAVAILABLE_PREFERENCES.map((preference) => {
            const Icon = preference.icon

            return (
              <div
                key={preference.label}
                className="rounded-xl border border-line-muted bg-surface/60 p-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    size={12}
                    strokeWidth={2}
                    className="text-ink-disabled"
                    aria-hidden
                  />
                  <span className="text-[11px] font-semibold text-ink-secondary">
                    {preference.label}
                  </span>
                </div>
                <div className="mt-1.5 flex gap-1">
                  {preference.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="flex-1 cursor-not-allowed rounded-md border border-line-muted px-1 py-1 text-[10px] font-semibold text-ink-disabled"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-line-muted bg-surface/60 px-2.5 py-2">
          <Waves
            size={12}
            strokeWidth={2}
            className="text-success-text"
            aria-hidden
          />
          <span className="text-[11px] font-semibold text-ink-secondary">
            Ferry crossings
          </span>
          <span className="ml-auto text-[10px] font-semibold text-success-text">
            Always avoided
          </span>
        </div>
      </fieldset>

      <div className="mt-4 flex items-start gap-2 border-t border-line pt-3">
        <MapIcon
          size={13}
          strokeWidth={2}
          className="mt-0.5 shrink-0 text-ink-muted"
          aria-hidden
        />
        <p className="text-[11px] leading-4 text-ink-muted">
          Nothing is saved yet. The generated loop is drawn on the map as a
          preview.
        </p>
      </div>
    </aside>
  )
}
