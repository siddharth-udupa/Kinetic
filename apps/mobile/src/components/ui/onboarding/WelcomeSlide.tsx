import { Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  IconBadge,
  PrimaryButton,
  SlideShell,
  type IconName,
} from "./primitives"
import { useTheme } from "@/hooks/useTheme"

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
  const { colors } = useTheme()

  return (
    <SlideShell
      center
      footer={<PrimaryButton label="Let's get started" icon="arrow-forward" onPress={onNext} />}
    >
      <View className="mb-8">
        <IconBadge icon="flash-outline" size={56} />
      </View>

      <Text className="text-[32px] leading-10 font-bold" style={{ color: colors.ink }}>
        Welcome{name ? `, ${name}` : ""}
      </Text>
      <Text
        className="text-[15px] leading-6 mt-3"
        style={{ color: colors.inkSecondary }}
      >
        Three quick questions and you're set up. Everything here can be changed
        later, so there are no wrong answers.
      </Text>

      <View className="mt-8">
        {HIGHLIGHTS.map((item) => (
          <View key={item.title} className="flex-row items-start mb-5">
            <View
              className="h-8 w-8 rounded-lg items-center justify-center mt-0.5"
              style={{ backgroundColor: colors.surfaceMuted }}
            >
              <Ionicons name={item.icon} size={15} color={colors.inkSecondary} />
            </View>
            <View className="flex-1 pl-3.5">
              <Text className="text-[15px] font-semibold" style={{ color: colors.ink }}>
                {item.title}
              </Text>
              <Text
                className="text-[14px] leading-5 mt-0.5"
                style={{ color: colors.inkSecondary }}
              >
                {item.body}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View
        className="self-start flex-row items-center gap-2 rounded-full px-3.5 py-2 mt-1"
        style={{ backgroundColor: colors.surfaceMuted }}
      >
        <Ionicons name="time-outline" size={14} color={colors.inkMuted} />
        <Text className="text-[13px] font-medium" style={{ color: colors.inkSecondary }}>
          About 30 seconds
        </Text>
      </View>
    </SlideShell>
  )
}
