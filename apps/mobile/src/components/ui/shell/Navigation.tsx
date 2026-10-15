import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { ComponentProps, ReactNode } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "@/hooks/useTheme"
import { APP_NAME } from "@repo/shared"

type IconName = ComponentProps<typeof Ionicons>["name"]

/** Mark and wordmark, on the same accent-soft plate the onboarding badges use. */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme()

  return (
    <View className="flex-row items-center gap-2.5">
      <View
        className="items-center justify-center rounded-xl"
        style={{ width: 34, height: 34, backgroundColor: colors.accentSoft }}
      >
        <Ionicons name="flash" size={16} color={colors.accent} />
      </View>

      {compact ? null : (
        <Text className="text-[17px] font-bold" style={{ color: colors.ink }}>
          {APP_NAME}
        </Text>
      )}
    </View>
  )
}

/** A round icon button in the header's action cluster. */
export function HeaderIconButton({
  icon,
  label,
  onPress,
  badge = false,
}: {
  icon: IconName
  label: string
  onPress?: () => void
  badge?: boolean
}) {
  const { colors } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className="size-10 items-center justify-center rounded-xl active:opacity-70"
      style={{ backgroundColor: colors.surfaceMuted }}
    >
      <Ionicons name={icon} size={19} color={colors.inkSecondary} />

      {badge ? (
        <View
          className="absolute top-2 right-2.5 rounded-full"
          style={{
            width: 8,
            height: 8,
            backgroundColor: colors.accent,
            borderWidth: 2,
            borderColor: colors.surfaceMuted,
          }}
        />
      ) : null}
    </Pressable>
  )
}

type TopBarProps = {
  onPressNotifications?: () => void
  trailing?: ReactNode
}

/** Sign-out lives on the "You" tab, next to the account it acts on. */
export function TopBar({ onPressNotifications, trailing }: TopBarProps) {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()

  return (
    <View
      className="border-b px-4 pb-3"
      style={{
        // Padding, not a spacer: the bottom border must land below the status bar.
        paddingTop: Math.max(insets.top, 12),
        backgroundColor: colors.surface,
        borderColor: colors.line,
      }}
    >
      <View className="h-11 flex-row items-center justify-between">
        <BrandMark />

        <View className="flex-row items-center gap-2">
          {trailing}
          <HeaderIconButton
            icon="notifications-outline"
            label="Notifications"
            onPress={onPressNotifications}
            badge
          />
        </View>
      </View>
    </View>
  )
}

export type TabKey = "home" | "maps" | "record" | "groups" | "you"

type TabItem = {
  key: TabKey
  label: string
  icon: IconName
  iconActive: IconName
}

/** Record is drawn by `TabBar` itself: it leaves the tab set rather than being another tab. */
export const TABS: TabItem[] = [
  { key: "home", label: "Home", icon: "home-outline", iconActive: "home" },
  { key: "maps", label: "Maps", icon: "map-outline", iconActive: "map" },
  { key: "record", label: "Record", icon: "reload-circle-outline", iconActive: "reload-circle" },
  { key: "groups", label: "Groups", icon: "people-outline", iconActive: "people" },
  { key: "you", label: "You", icon: "person-outline", iconActive: "person" },
]

type TabBarProps = {
  activeTab: TabKey
  onSelect: (tab: TabKey) => void
  onRecord: () => void
}

/** Selection carries three signals: accent glyph, accent word, tinted plate, because a 10px
 *  grey label alone is easy to miss with a thumb. */
export function TabBar({ activeTab, onSelect, onRecord }: TabBarProps) {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()

  return (
    <View
      className="flex-row border-t px-2 pt-2"
      style={{
        paddingBottom: Math.max(insets.bottom, 10),
        backgroundColor: colors.surface,
        borderColor: colors.line,
      }}
    >
      {TABS.map((tab) => {
        const isRecord = tab.key === "record"

        if (isRecord) {
          return (
            <RecordButton key={tab.key} label={tab.label} onPress={onRecord} />
          )
        }

        const isActive = activeTab === tab.key

        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            className="flex-1 items-center justify-center py-1"
          >
            <View
              className="h-8 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: isActive ? colors.accentSoft : "transparent" }}
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={22}
                color={isActive ? colors.accent : colors.inkMuted}
              />
            </View>

            <Text
              className="mt-1 text-[10px] font-semibold"
              style={{ color: isActive ? colors.accentText : colors.inkMuted }}
            >
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Half-lifted and ringed in the page colour, so the bar appears to pass behind it. */
function RecordButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Record an activity"
      className="flex-1 items-center justify-center"
    >
      <View
        className="-mt-6 size-14 items-center justify-center rounded-full"
        style={{
          backgroundColor: colors.accent,
          borderWidth: 4,
          borderColor: colors.surface,
        }}
      >
        <Ionicons name="reload-circle" size={26} color={colors.onAccent} />
      </View>

      <Text className="mt-1 text-[10px] font-semibold" style={{ color: colors.inkMuted }}>
        {label}
      </Text>
    </Pressable>
  )
}