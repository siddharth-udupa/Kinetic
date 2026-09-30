"use client"

import { ICONS, type IconName } from "./icons"
import { IconBadge, PrimaryButton, SlideShell } from "./primitives"
import { useOnboardingTheme } from "./theme"

type Props = {
  name: string
  onNext: () => void
}

const HIGHLIGHTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "map-outline",
    title: "Every run, recorded",
    body: "Route, splits and elevation captured as you go.",
  },
  {
    icon: "people-outline",
    title: "Your people, closer",
    body: "Follow the athletes you run with and cheer them on.",
  },
  {
    icon: "stats-chart-outline",
    title: "Progress you can see",
    body: "Weekly volume, pace trends and personal bests.",
  },
]

export default function WelcomeSlide({ name, onNext }: Props) {
  const { colors } = useOnboardingTheme()
  const Clock = ICONS["time-outline"]

  return (
    <SlideShell
      center
      footer={
        <PrimaryButton label="Let's get started" icon="arrow-forward" onPress={onNext} />
      }
    >
      <div className="mb-8">
        <IconBadge icon="flash-outline" size={56} />
      </div>

      <h2 className="text-[32px] leading-10 font-bold text-balance" style={{ color: colors.text }}>
        Welcome{name ? `, ${name}` : ""}
      </h2>
      <p
        className="mt-3 text-[15px] leading-6 text-pretty"
        style={{ color: colors.textSecondary }}
      >
        Three quick questions and you&apos;re set up. Everything here can be changed later, so
        there are no wrong answers.
      </p>

      <div className="mt-8">
        {HIGHLIGHTS.map((item) => {
          const Icon = ICONS[item.icon]

          return (
            <div key={item.title} className="mb-5 flex items-start">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: colors.cardMuted }}
              >
                <Icon size={15} strokeWidth={2} style={{ color: colors.textSecondary }} aria-hidden />
              </span>
              <div className="flex-1 pl-3.5">
                <p className="text-[15px] font-semibold" style={{ color: colors.text }}>
                  {item.title}
                </p>
                <p
                  className="mt-0.5 text-[14px] leading-5 text-pretty"
                  style={{ color: colors.textSecondary }}
                >
                  {item.body}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="mt-1 flex w-fit items-center gap-2 rounded-full px-3.5 py-2"
        style={{ backgroundColor: colors.cardMuted }}
      >
        <Clock size={14} strokeWidth={2} style={{ color: colors.textMuted }} aria-hidden />
        <span className="text-[13px] font-medium" style={{ color: colors.textSecondary }}>
          About 30 seconds
        </span>
      </div>
    </SlideShell>
  )
}
