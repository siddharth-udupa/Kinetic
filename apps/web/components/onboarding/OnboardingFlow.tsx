"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  OnboardingThemeProvider,
  onboardingVars,
  useOnboardingTheme,
  type ThemeScheme,
} from "./theme"
import type { OnboardingPrefs } from "./prefs"
import ProgressHeader from "./ProgressHeader"
import WelcomeSlide from "./WelcomeSlide"
import UsernameSlide from "./UsernameSlide"
import UnitsSystemSlide from "./UnitsSystemSlide"
import UnitsDetailSlide from "./UnitsDetailSlide"
import AppearanceSlide from "./AppearanceSlide"
import ReviewSlide from "./ReviewSlide"

/** Slide order. The username slide sits at index 1 so index 0 is the welcome. */
const SLIDE = {
  welcome: 0,
  username: 1,
  unitsSystem: 2,
  unitsDetail: 3,
  appearance: 4,
  review: 5,
} as const

const TOTAL_SLIDES = 6

const SKIP_DISABLED_ON: readonly number[] = [SLIDE.welcome, SLIDE.username]

function clamp(index: number) {
  return Math.min(Math.max(index, 0), TOTAL_SLIDES - 1)
}

type Props = {
  userName: string
  initialPrefs: OnboardingPrefs
}

export default function OnboardingFlow({ userName, initialPrefs }: Props) {
  return (
    <OnboardingThemeProvider initialScheme={initialPrefs.theme}>
      <OnboardingSurface userName={userName} initialPrefs={initialPrefs} />
    </OnboardingThemeProvider>
  )
}

function OnboardingSurface({ userName, initialPrefs }: Props) {
  const router = useRouter()
  const { colors, isDark, setScheme } = useOnboardingTheme()

  const [currentSlide, setCurrentSlide] = useState<number>(SLIDE.welcome)
  const [username, setUsername] = useState("")
  const [hasUsername, setHasUsername] = useState(false)
  const [prefs, setPrefs] = useState<OnboardingPrefs>(initialPrefs)
  const [isSavingUsername, setIsSavingUsername] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)

  /* ── Live theme preview ──────────────────────────────────────────────
   * Tapping a theme on the appearance slide repaints the running flow, the same
   * promise `setColorScheme` makes on mobile. Unlike mobile the override is
   * scoped to this provider, so it dies with the flow either way — the flag
   * below exists only to stop the reset from running on the way out.
   *
   * A ref rather than state: the flag is read in an unmount cleanup, and a
   * state flag would re-run the effect the moment it flips.
   */
  const didCommit = useRef(false)

  useEffect(
    () => () => {
      if (!didCommit.current) setScheme("system")
    },
    [setScheme],
  )

  // Declared as a plain generic function rather than a `useCallback` wrapper:
  // hoisting the generic into a callback erases it, leaving `K` as the union of
  // every pref and letting a slide write the wrong value into a field.
  function updatePref<K extends keyof OnboardingPrefs>(key: K, value: OnboardingPrefs[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }))
  }

  /* ── Navigation ──────────────────────────────────────────────────── */
  const goTo = useCallback((index: number) => {
    setCurrentSlide(clamp(index))
  }, [])

  /* Swiping is the mobile affordance; a pointer has none. Arrow keys stand in
   * for it on the web, and are ignored while a field is being typed into. */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)

      if (isTyping) return

      if (event.key === "ArrowRight") {
        setCurrentSlide((prev) => clamp(prev + 1))
      } else if (event.key === "ArrowLeft") {
        setCurrentSlide((prev) => clamp(prev - 1))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  /* ── Requests ─────────────────────────────────────────────────────── */
  async function patch(url: string, body: unknown, fallback: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null

      if (!response.ok) return payload?.error ?? fallback
      return null
    } catch {
      return fallback
    }
  }

  /* ── Actions ─────────────────────────────────────────────────────── */
  async function handleSaveUsername(next: string): Promise<string | null> {
    setIsSavingUsername(true)
    const err = await patch("/api/user", { username: next }, "Failed to update username.")
    setIsSavingUsername(false)
    if (!err) setHasUsername(true)
    return err
  }

  async function savePreferences(
    data: Partial<OnboardingPrefs> & { onBoarded?: boolean },
  ): Promise<string | null> {
    setFinishError(null)
    setIsFinishing(true)
    const err = await patch("/api/preferences", data, "Failed to save preferences.")
    setIsFinishing(false)

    if (err) setFinishError(err)
    return err
  }

  function leave() {
    didCommit.current = true
    router.replace("/dashboard")
  }

  async function handleFinish() {
    // The review screen can be reached by skipping past an unfilled username,
    // so send them back rather than finishing with a blank profile.
    if (!hasUsername) {
      goTo(SLIDE.username)
      return
    }

    const err = await savePreferences({ ...prefs, onBoarded: true })
    if (err) return

    leave()
  }

  async function handleSkip() {
    const err = await savePreferences({ onBoarded: true })
    if (err) {
      goTo(SLIDE.review)
      return
    }

    leave()
  }

  /* ── Slides ──────────────────────────────────────────────────────── */
  const canSkip = !SKIP_DISABLED_ON.includes(currentSlide)

  return (
    <div
      className="flex flex-col"
      style={{
        ...onboardingVars(colors, isDark),
        backgroundColor: colors.page,
        /*
         * Claim the viewport below the shell header rather than growing with
         * the body column. `dvh` tracks the mobile URL bar collapsing; the
         * `100vh` it falls back to is the next best thing. A definite height is
         * what lets the column hand its free space to the slide, which in turn
         * scrolls its own body and keeps the action pinned.
         */
        height: "calc(100dvh - var(--shell-header-h))",
      }}
    >
      {/* ── Progress + skip ── */}
      <ProgressHeader
        step={currentSlide + 1}
        total={TOTAL_SLIDES}
        onSkip={canSkip ? handleSkip : undefined}
      />

      {/*
        Keyed on the slide index so each step replays the fade the mobile stack
        plays on push, instead of the previous slide's content being patched
        under a still-visible heading.
      */}
      <div key={currentSlide} className="ob-slide-in flex min-h-0 flex-1 flex-col">
        {currentSlide === SLIDE.welcome ? (
          <WelcomeSlide name={userName} onNext={() => goTo(SLIDE.username)} />
        ) : null}

        {currentSlide === SLIDE.username ? (
          <UsernameSlide
            username={username}
            onChange={setUsername}
            onSave={handleSaveUsername}
            onNext={() => goTo(SLIDE.unitsSystem)}
            isSaving={isSavingUsername}
          />
        ) : null}

        {currentSlide === SLIDE.unitsSystem ? (
          <UnitsSystemSlide
            prefs={prefs}
            onChange={updatePref}
            onNext={() => goTo(SLIDE.unitsDetail)}
          />
        ) : null}

        {currentSlide === SLIDE.unitsDetail ? (
          <UnitsDetailSlide
            prefs={prefs}
            onChange={updatePref}
            onNext={() => goTo(SLIDE.appearance)}
          />
        ) : null}

        {currentSlide === SLIDE.appearance ? (
          <AppearanceSlide
            prefs={prefs}
            onChange={(key, value) => {
              updatePref(key, value)
              // Repaint immediately so the choice is seen, not described.
              if (key === "theme") {
                setScheme(value as ThemeScheme)
              }
            }}
            onNext={() => goTo(SLIDE.review)}
          />
        ) : null}

        {currentSlide === SLIDE.review ? (
          <ReviewSlide
            prefs={prefs}
            username={username}
            hasUsername={hasUsername}
            onEdit={goTo}
            onFinish={handleFinish}
            isSaving={isFinishing}
            error={finishError}
          />
        ) : null}
      </div>

      {/* Replaces the mobile home-indicator spacer. */}
      <div className="h-5 shrink-0 sm:h-6" aria-hidden />
    </div>
  )
}
