"use client"

import type { InputHTMLAttributes, ReactNode } from "react"
import { useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn, signUp } from "@/lib/auth-client"
import { ICONS, type IconName } from "@/components/onboarding/icons"
import { Banner, IconBadge, PrimaryButton, Segmented } from "@/components/onboarding/primitives"
import { ThemeProvider, themeVars, useTheme } from "@/components/theme"

type Mode = "signin" | "signup"

const MIN_PASSWORD_LENGTH = 8

/**
 * One copy table for both tabs.
 *
 * The old screen swapped a single heading and left the rest of the page saying
 * "sign in" while the form asked for a name. Every user-visible string for a
 * mode now lives here, so a tab is a different screen rather than a different
 * first paragraph.
 */
const COPY: Record<
  Mode,
  {
    eyebrow: string
    title: string
    subtitle: string
    google: string
    divider: string
    cta: string
    trust: string
  }
> = {
  signin: {
    eyebrow: "Welcome back",
    title: "Sign in to your account",
    subtitle: "Your activities, routes and segments are exactly where you left them.",
    google: "Continue with Google",
    divider: "or continue with email",
    cta: "Sign in",
    trust: "Your session stays on this device until you sign out.",
  },
  signup: {
    eyebrow: "Join the club",
    title: "Create your account",
    subtitle: "A couple of quick questions after this and you'll be logging activities.",
    google: "Sign up with Google",
    divider: "or sign up with email",
    cta: "Create account",
    trust: "We only use your email to sign you in. Nothing else.",
  },
}

const EyeIcon = ICONS["eye-outline"]
const EyeOffIcon = ICONS["eye-off-outline"]

/** Google's mark, inline — four paths so the brand colours survive theming. */
function GoogleMark() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  icon: IconName
  /** Rendered inside the control, on the trailing edge — a reveal toggle. */
  trailing?: ReactNode
}

/**
 * Labelled field with a leading glyph.
 *
 * The old inputs were bare bordered boxes with a label floating above them, so
 * the row read as three unrelated inputs. The glyph, the 56px height and the
 * label sitting *inside* the control make each one read as a single object.
 */
function Field({ id, label, icon, trailing, className, ...inputProps }: FieldProps) {
  const { colors } = useTheme()
  const Icon = ICONS[icon]

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <div className="group relative flex items-center rounded-xl border border-line bg-surface transition-colors focus-within:border-accent">
        <Icon
          size={18}
          strokeWidth={2}
          className="pointer-events-none ml-4 shrink-0 transition-colors group-focus-within:text-accent"
          style={{ color: colors.textMuted }}
          aria-hidden
        />

        <input
          id={id}
          aria-label={label}
          className={`h-14 min-w-0 flex-1 bg-transparent px-3 text-[16px] font-medium text-ink caret-accent outline-none placeholder:font-normal placeholder:text-ink-muted ${className ?? ""}`}
          {...inputProps}
        />

        {trailing ? <div className="shrink-0 pr-2">{trailing}</div> : null}
      </div>
    </div>
  )
}

export default function AuthScreen() {
  return (
    <ThemeProvider>
      <AuthSurface />
    </ThemeProvider>
  )
}

function AuthSurface() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { colors, isDark } = useTheme()

  const [mode, setMode] = useState<Mode>("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Which request is in flight, so the two buttons disable independently. */
  const [pending, setPending] = useState<"form" | "google" | null>(null)

  /*
   * The action lives in the pinned footer, outside the <form>, so the footer
   * cannot simply be a submit button. `requestSubmit` keeps it going through
   * the form's own submit handler — Enter in a field and the button run the
   * exact same path, rather than two copies of it drifting apart.
   */
  const formRef = useRef<HTMLFormElement>(null)

  const copy = COPY[mode]
  const isSignup = mode === "signup"

  const emailOk = email.trim().length > 0
  const passwordOk = password.length >= MIN_PASSWORD_LENGTH
  const nameOk = name.trim().length > 0
  const isComplete = emailOk && passwordOk && (!isSignup || nameOk)

  function changeMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    // Errors belong to the attempt that produced them; carrying one across the
    // tab switch told the user the email they just cleared was rejected.
    setError(null)
    setPending(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !isComplete) return

    setError(null)
    setPending("form")

    try {
      const result = isSignup
        ? await signUp.email({ name: name.trim(), email: email.trim(), password })
        : await signIn.email({ email: email.trim(), password })

      if (result.error) {
        setError(result.error.message ?? (isSignup ? "Could not create your account." : "Could not sign you in."))
        return
      }

      router.push(searchParams.get("callbackUrl") ?? "/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setPending(null)
    }
  }

  async function handleGoogle() {
    if (pending) return

    setError(null)
    setPending("google")

    try {
      const { error: oauthError } = await signIn.social({
        provider: "google",
        callbackURL: searchParams.get("callbackUrl") ?? "/dashboard",
      })
      // No error means the browser is already navigating to Google, so the
      // button deliberately stays busy instead of flashing back to idle.
      if (oauthError) setError(oauthError.message ?? "Google sign-in failed.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.")
    } finally {
      setPending((current) => (current === "google" ? null : current))
    }
  }

  const LockIcon = ICONS["lock-closed-outline"]

  return (
    <div
      className="flex flex-col"
      style={{
        ...themeVars(colors, isDark),
        backgroundColor: colors.page,
        /*
         * Claim the viewport below the shell header rather than growing with
         * the body column, so the column can hand its free space to the form
         * and the action stays pinned even on a short window.
         */
        height: "calc(100dvh - var(--shell-header-h))",
      }}
    >
      <div className="ob-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-2">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="mx-auto my-auto flex w-full max-w-md flex-col items-center py-6"
        >
          {/*
            Keyed on the tab so the new mode replays the same fade the mobile
            stack plays, instead of the previous heading being patched under a
            still-visible title.
          */}
          <div key={mode} className="ob-slide-in flex w-full flex-col items-center">
            <IconBadge icon="flash-outline" size={56} />

            <p
              className="mt-6 text-xs font-semibold tracking-widest uppercase"
              style={{ color: colors.accentText }}
            >
              {copy.eyebrow}
            </p>
            <h1
              className="mt-2.5 text-[28px] leading-9 font-bold text-balance text-center"
              style={{ color: colors.text }}
            >
              {copy.title}
            </h1>
            <p
              className="mt-3 max-w-sm text-[15px] leading-6 text-pretty text-center"
              style={{ color: colors.textSecondary }}
            >
              {copy.subtitle}
            </p>
          </div>

          {/* Tabs — the muted-track segmented control, not two solid buttons. */}
          <div className="mt-7 w-full">
            <Segmented<Mode>
              options={[
                { label: "Sign in", value: "signin" },
                { label: "Sign up", value: "signup" },
              ]}
              value={mode}
              onChange={changeMode}
            />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={pending !== null}
            aria-busy={pending === "google" || undefined}
            aria-label={copy.google}
            className="mt-3 flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl border text-[15px] font-semibold transition active:opacity-70 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            style={{ borderColor: colors.border, backgroundColor: colors.card }}
          >
            <GoogleMark />
            <span style={{ color: colors.text }}>{copy.google}</span>
          </button>

          <div className="my-6 flex w-full items-center gap-3">
            <div className="h-px flex-1" style={{ backgroundColor: colors.border }} />
            <span className="text-[13px]" style={{ color: colors.textMuted }}>
              {copy.divider}
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: colors.border }} />
          </div>

          <div className="flex w-full flex-col gap-3.5">
            {isSignup ? (
              <Field
                id="name"
                label="Name"
                icon="person-outline"
                autoComplete="name"
                autoCapitalize="words"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : null}

            <Field
              id="email"
              label="Email"
              icon="mail-outline"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="placeholder:lowercase"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Field
              id="password"
              label="Password"
              icon="lock-closed-outline"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
                  style={{ color: colors.textMuted }}
                >
                  {showPassword ? (
                    <EyeOffIcon size={19} strokeWidth={2} aria-hidden />
                  ) : (
                    <EyeIcon size={19} strokeWidth={2} aria-hidden />
                  )}
                </button>
              }
            />

            {/* Helper line — the reason the button is still disabled. */}
            <div className="flex items-center justify-between px-1">
              {isSignup ? (
                <span className="text-[13px]" style={{ color: colors.textMuted }}>
                  Minimum {MIN_PASSWORD_LENGTH} characters
                </span>
              ) : (
                <span />
              )}
              {password.length > 0 && !passwordOk ? (
                <span className="text-[13px]" style={{ color: colors.danger }}>
                  {MIN_PASSWORD_LENGTH - password.length} more
                </span>
              ) : null}
            </div>

            {error ? (
              <div role="alert">
                <Banner tone="danger" icon="alert-circle-outline">
                  {error}
                </Banner>
              </div>
            ) : null}
          </div>
        </form>
      </div>

      {/* Pinned action — same place on every mode, so it is never hunted for. */}
      <div className="shrink-0 px-6 pt-1 pb-1">
        <div className="mx-auto w-full max-w-md">
          <PrimaryButton
            label={copy.cta}
            icon="arrow-forward"
            disabled={!isComplete}
            loading={pending === "form"}
            onPress={() => formRef.current?.requestSubmit()}
          />

          <div className="mt-3 flex items-start justify-center gap-1.5 pb-2">
            <LockIcon size={13} strokeWidth={2} className="mt-px shrink-0" style={{ color: colors.textMuted }} aria-hidden />
            <p className="text-[12px] leading-4 text-center" style={{ color: colors.textMuted }}>
              {copy.trust}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}