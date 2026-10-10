"use client"

import { ICONS } from "./icons"
import { useTheme } from "../theme"

type Props = {
  /** 1-based. */
  step: number
  total: number
  /**
   * Omit to hide the skip action. The welcome and username slides pass
   * nothing, so the row keeps its height and the layout never jumps as the
   * user advances.
   */
  onSkip?: () => void
}

/**
 * Single source of "how far along am I".
 *
 * One continuous bar rather than a bar plus a dot strip: the old screen showed
 * both, which said the same thing twice. A minimum width keeps the first step
 * from reading as an empty track.
 */
export default function ProgressHeader({ step, total, onSkip }: Props) {
  const { colors } = useTheme()
  const ChevronForward = ICONS["chevron-forward"]

  return (
    <div className="px-6 pt-3 pb-5 sm:pt-5">
      <div className="mx-auto w-full max-w-xl">
        <div className="flex h-11 items-center justify-between">
          <p
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: colors.textMuted }}
          >
            Step {step} of {total}
          </p>

          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              aria-label="Skip setup"
              className="flex h-9 cursor-pointer items-center gap-1 rounded-full pr-3 pl-4 text-sm font-semibold transition active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ob-accent)"
              style={{ backgroundColor: colors.cardMuted }}
            >
              <span style={{ color: colors.textSecondary }}>Skip</span>
              <ChevronForward size={14} strokeWidth={2} style={{ color: colors.textMuted }} aria-hidden />
            </button>
          ) : (
            <div className="h-9" aria-hidden />
          )}
        </div>

        <div
          className="h-1.5 overflow-hidden rounded-full"
          style={{ backgroundColor: colors.border }}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step}
          aria-label={`Step ${step} of ${total}`}
        >
          <div
            className="h-1.5 rounded-full transition-[width] duration-380 ease-[cubic-bezier(0.215,0.61,0.355,1)]"
            style={{
              width: `${Math.max((step / total) * 100, 7)}%`,
              backgroundColor: colors.accent,
            }}
          />
        </div>
      </div>
    </div>
  )
}
