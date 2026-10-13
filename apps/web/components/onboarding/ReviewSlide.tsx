"use client"

import {
  Banner,
  PrimaryButton,
  ReviewRow,
  ReviewSection,
  SlideHeading,
  SlideShell,
} from "./primitives"
import { useTheme } from "@/hooks/useTheme"
import {
  ELEVATION_LABELS,
  PACE_LABELS,
  SPEED_LABELS,
  SYSTEM_LABELS,
  THEME_LABELS,
  TIME_LABELS,
  WEIGHT_LABELS,
} from "./prefs"
import type { OnboardingPrefs } from "./prefs"

type Props = {
  prefs: OnboardingPrefs
  username: string
  hasUsername: boolean
  onEdit: (slide: number) => void
  onFinish: () => void
  isSaving: boolean
  error: string | null
}

/** Slide indices the review rows jump back to. */
export const REVIEW_TARGETS = {
  username: 1,
  system: 2,
  detail: 3,
  appearance: 4,
} as const

/**
 * Everything chosen, in one place, each row tappable to go back and change it.
 *
 * Re-reading back a whole screen of small decisions is the last chance to catch
 * a mis-tap, and doing it here costs one glance instead of four back-clicks.
 */
export default function ReviewSlide({
  prefs,
  username,
  hasUsername,
  onEdit,
  onFinish,
  isSaving,
  error,
}: Props) {
  const { colors } = useTheme()

  return (
    <SlideShell
      footer={
        <>
          {error ? (
            <Banner tone="danger" icon="alert-circle-outline">
              {error}
            </Banner>
          ) : null}
          <PrimaryButton
            label={hasUsername ? "Start running" : "Add your username"}
            icon={hasUsername ? "checkmark" : "arrow-back"}
            loading={isSaving}
            onPress={onFinish}
          />
        </>
      }
    >
      <SlideHeading
        icon="checkmark-done-outline"
        title="You're all set"
        subtitle="Tap any row to change it. Nothing here is locked in."
      />

      {hasUsername ? null : (
        <Banner tone="info" icon="person-outline">
          You&apos;ll need a username before we can finish. Tap below to add one.
        </Banner>
      )}

      <ReviewSection title="Profile">
        <ReviewRow
          label="Username"
          value={hasUsername ? `@${username}` : "Not set yet"}
          onPress={() => onEdit(REVIEW_TARGETS.username)}
          isLast
        />
      </ReviewSection>

      <ReviewSection title="Units">
        <ReviewRow
          label="System"
          value={SYSTEM_LABELS[prefs.distanceUnit]}
          onPress={() => onEdit(REVIEW_TARGETS.system)}
        />
        <ReviewRow
          label="Elevation"
          value={ELEVATION_LABELS[prefs.elevationUnit]}
          onPress={() => onEdit(REVIEW_TARGETS.detail)}
        />
        <ReviewRow
          label="Pace"
          value={PACE_LABELS[prefs.paceUnit]}
          onPress={() => onEdit(REVIEW_TARGETS.detail)}
        />
        <ReviewRow
          label="Speed"
          value={SPEED_LABELS[prefs.speedUnit]}
          onPress={() => onEdit(REVIEW_TARGETS.detail)}
        />
        <ReviewRow
          label="Weight"
          value={WEIGHT_LABELS[prefs.weightUnit]}
          onPress={() => onEdit(REVIEW_TARGETS.detail)}
          isLast
        />
      </ReviewSection>

      <ReviewSection title="Appearance">
        <ReviewRow
          label="Theme"
          value={THEME_LABELS[prefs.theme]}
          onPress={() => onEdit(REVIEW_TARGETS.appearance)}
        />
        <ReviewRow
          label="Time"
          value={TIME_LABELS[prefs.timeFormat]}
          onPress={() => onEdit(REVIEW_TARGETS.appearance)}
          isLast
        />
      </ReviewSection>

      <p
        className="mt-2 text-center text-[12px] leading-5"
        style={{ color: colors.textMuted }}
      >
        All of this lives in your profile and can be changed whenever you like.
      </p>
    </SlideShell>
  )
}
