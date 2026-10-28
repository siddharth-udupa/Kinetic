"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  Compass,
  Dices,
  Footprints,
  Layers,
  Loader2,
  MapPin,
  Mountain,
  Route,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Trees,
  Waves,
  type LucideIcon,
} from "lucide-react"
import type {
  LoopRequest,
  LoopResponse,
  RouteProfile,
} from "@repo/validation"

/** The first version always starts at MG Road. Start-point picking is next. */
const ORIGIN = { lat: 12.9716, lon: 77.5946 }
const ORIGIN_LABEL = "MG Road, Bengaluru"

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

function formatDistance(meters: number): string {
  return `${(meters / 1_000).toFixed(1)} km`
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3_600)
  const minutes = Math.round((seconds % 3_600) / 60)

  if (hours === 0) return `${minutes} min`
  return `${hours} h ${minutes} min`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function errorOf(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined
  return typeof payload.error === "string" ? payload.error : undefined
}

export default function RoutePlanner() {
  const [distanceKm, setDistanceKm] = useState(10)
  const [profile, setProfile] = useState<RouteProfile>("bike")
  const [seed, setSeed] = useState("")

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const [result, setResult] = useState<LoopResponse | null>(null)
  const [error, setError] = useState<{
    message: string
    needsSignIn: boolean
  } | null>(null)

  function randomizeSeed() {
    setSeed(String(Math.floor(Math.random() * (MAX_SEED + 1))))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === "loading") return

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
      setError({
        message: `Seed must be a whole number between 0 and ${MAX_SEED.toLocaleString()}.`,
        needsSignIn: false,
      })
      return
    }

    const payload: LoopRequest = {
      origin: ORIGIN,
      distanceMeters: distanceKm * 1_000,
      profile,
      ...(seedValue === undefined ? {} : { seed: seedValue }),
    }

    setStatus("loading")
    setResult(null)
    setError(null)

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

      setResult(body as LoopResponse)
      setStatus("success")
      console.log("[route] generated loop", body)
    } catch {
      setStatus("error")
      setError({
        message:
          "Could not reach the route engine. Check that it is running, then try again.",
        needsSignIn: false,
      })
    }
  }

  return (
    <aside
      className="absolute inset-x-3 bottom-3 z-10 max-h-[68%] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface/95 p-5 shadow-card backdrop-blur-md sm:inset-y-4 sm:right-auto sm:left-4 sm:max-h-none sm:w-[390px] sm:p-6"
      aria-label="Loop preferences"
    >
      <header>
        <p className="text-[11px] font-semibold tracking-widest text-accent-text uppercase">
          Route builder
        </p>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight text-ink">
          Plan a loop
        </h1>
        <p className="mt-1.5 text-[12px] leading-5 text-ink-secondary">
          Pick a distance and an activity. The engine finds a route that starts
          and finishes at the same point.
        </p>
      </header>

      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-line bg-surface-muted px-3 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-accent-text">
          <MapPin size={15} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-ink">{ORIGIN_LABEL}</p>
          <p className="text-[11px] text-ink-muted">
            Fixed start for this first version
          </p>
        </div>
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
                  className={`flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-3 text-left transition active:opacity-80 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
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
          disabled={status === "loading"}
          aria-busy={status === "loading" || undefined}
          className={`mt-5 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-on-accent transition hover:bg-accent-hover active:bg-accent-pressed disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
        >
          {status === "loading" ? (
            <Loader2 size={17} strokeWidth={2.4} className="animate-spin" aria-hidden />
          ) : (
            <Sparkles size={17} strokeWidth={2.4} aria-hidden />
          )}
          {status === "loading" ? "Building your loop…" : "Generate loop"}
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
                  Loop generated
                </p>
              </div>
              <p className="mt-1.5 text-[12px] text-ink-secondary">
                {formatDistance(result.distanceMeters)} ·{" "}
                {formatDuration(result.durationSeconds)} ·{" "}
                {result.elevationGainMeters} m climb
              </p>
              <p className="mt-1 text-[11px] leading-4 text-ink-muted">
                Seed {result.seed} ·{" "}
                {(result.accuracy * 100).toFixed(1)}% from target. Full route
                logged to the server console.
              </p>
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
                    Could not build the loop
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-ink-secondary">
                    {error.message}
                  </p>
                  {error.needsSignIn ? (
                    <Link
                      href="/auth?callbackUrl=/maps/route"
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
        <Terminal
          size={13}
          strokeWidth={2}
          className="mt-0.5 shrink-0 text-ink-muted"
          aria-hidden
        />
        <p className="text-[11px] leading-4 text-ink-muted">
          Nothing is saved yet. The generated route is logged to the Next.js
          server console; the map preview comes next.
        </p>
      </div>
    </aside>
  )
}
