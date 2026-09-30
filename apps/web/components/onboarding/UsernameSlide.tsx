"use client"

import { useState, type FormEvent } from "react"
import { ICONS } from "./icons"
import { Banner, PrimaryButton, SlideHeading, SlideShell } from "./primitives"
import { useOnboardingTheme } from "./theme"

type Props = {
  username: string
  onChange: (value: string) => void
  onSave: (username: string) => Promise<string | null>
  onNext: () => void
  isSaving: boolean
}

const MIN_LENGTH = 3
const MAX_LENGTH = 20

function getValidationMessage(value: string): string | null {
  if (value.length === 0) return null
  if (value.length < MIN_LENGTH) {
    return `At least ${MIN_LENGTH} characters.`
  }
  if (value.length > MAX_LENGTH) {
    return `Maximum ${MAX_LENGTH} characters.`
  }
  if (!/^[a-z0-9_]+$/.test(value)) {
    return "Letters, numbers and underscores only."
  }
  return null
}

export default function UsernameSlide({ username, onChange, onSave, onNext, isSaving }: Props) {
  const { colors } = useOnboardingTheme()
  const [apiError, setApiError] = useState<string | null>(null)
  const CheckCircle = ICONS["checkmark-circle"]
  const Lock = ICONS["lock-closed-outline"]

  const normalized = username.toLowerCase().replace(/\s/g, "")
  const validationMsg = getValidationMessage(normalized)
  const isValid = normalized.length >= MIN_LENGTH && !validationMsg

  async function handleContinue() {
    if (!isValid) return
    setApiError(null)
    const err = await onSave(normalized)
    if (err) {
      setApiError(err)
    } else {
      onNext()
    }
  }

  function handleChange(next: string) {
    setApiError(null)
    onChange(next.toLowerCase().replace(/\s/g, ""))
  }

  const message = apiError ?? validationMsg
  const hasText = normalized.length > 0

  return (
    <SlideShell
      footer={
        <PrimaryButton
          label="Continue"
          disabled={!isValid}
          loading={isSaving}
          icon="arrow-forward"
          onPress={handleContinue}
        />
      }
    >
      <SlideHeading
        icon="person-outline"
        title="Pick a username"
        subtitle="This is how other runners will find you. You can change it any time."
      />

      {/*
        Live preview of the finished profile.

        Deliberately built to not look like the field below it: flat muted
        surface with no border, a leading avatar instead of an `@` prefix, and
        a caption. An earlier version was a bordered box with a leading glyph,
        which users read as a second input and tried to tap.
      */}
      <div
        className="mb-6 rounded-2xl px-4 py-3.5"
        style={{ backgroundColor: colors.cardMuted }}
      >
        <p
          className="mb-2.5 text-[11px] font-semibold tracking-widest uppercase"
          style={{ color: colors.textMuted }}
        >
          How you&apos;ll appear
        </p>

        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: isValid ? colors.accent : colors.border }}
          >
            <span
              className="text-[16px] font-bold"
              style={{ color: isValid ? colors.onAccent : colors.textMuted }}
            >
              {(normalized[0] ?? "?").toUpperCase()}
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[16px] font-semibold"
              style={{ color: hasText ? colors.text : colors.textSecondary }}
            >
              {hasText ? `@${normalized}` : "@your_username"}
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: colors.textSecondary }}>
              {isValid ? "Ready to save" : "Your public profile name"}
            </p>
          </div>
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          void handleContinue()
        }}
      >
        <label
          htmlFor="onboarding-username"
          className="flex h-14 items-center rounded-xl border px-4 transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--ob-accent)"
          style={{
            borderColor: message ? colors.danger : isValid ? colors.accent : colors.border,
            backgroundColor: colors.card,
          }}
        >
          <span className="mr-1 text-[16px] font-medium" style={{ color: colors.textMuted }}>
            @
          </span>
          <input
            id="onboarding-username"
            name="username"
            className="min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none placeholder-(--ob-text-muted)"
            placeholder="your_username"
            value={normalized}
            onChange={(event) => handleChange(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            maxLength={MAX_LENGTH}
            style={{ color: colors.text }}
          />
          {isValid ? (
            <CheckCircle size={20} strokeWidth={2} style={{ color: colors.accent }} aria-hidden />
          ) : null}
        </label>
      </form>

      {/* Helper line — count, or the reason the button is still disabled. */}
      <div className="mt-2.5 flex items-center justify-between px-1">
        {message ? (
          <p className="flex-1 text-[13px]" style={{ color: colors.danger }}>
            {message}
          </p>
        ) : (
          <p className="flex-1 text-[13px]" style={{ color: colors.textMuted }}>
            {MIN_LENGTH}–{MAX_LENGTH} characters
          </p>
        )}
        <p className="text-[13px]" style={{ color: colors.textMuted }}>
          {normalized.length}/{MAX_LENGTH}
        </p>
      </div>

      {apiError ? (
        <div className="mt-5">
          <Banner tone="danger" icon="alert-circle-outline">
            {apiError} — try another name.
          </Banner>
        </div>
      ) : null}

      {/* Reassurance in place of the skip control, which is hidden here. */}
      <div className="mt-7 flex items-center gap-2">
        <Lock size={13} strokeWidth={2} className="shrink-0" style={{ color: colors.textMuted }} aria-hidden />
        <p className="flex-1 text-[12px]" style={{ color: colors.textMuted }}>
          A username is required, so this step can&apos;t be skipped.
        </p>
      </div>
    </SlideShell>
  )
}
