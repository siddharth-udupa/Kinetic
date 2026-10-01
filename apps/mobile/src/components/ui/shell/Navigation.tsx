import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { ComponentProps, ReactNode } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useOnboardingTheme } from "../onboarding/theme"
import { APP_NAME } from "@/lib/brand"

type IconName = ComponentProps<typeof Ionicons>["name"]

/**
 * Top and bottom navigation for the signed-in app.
 *
 * The old pair were hand-rolled inside the dashboard screen out of raw Tailwind
 * greys and a hard-coded `#FC5200`, which meant neither could respond to the
 * athlete's chosen theme — a dark-mode tab bar still had `dark:bg-slate-900`
 * fighting a light page, and the status bar stayed `dark-content` over it.
 *
 * Both bars now read the onboarding theme, so they are the same objects in both
 * schemes and match the web shell bar for bar.
 */

/* ── Header ─────────────────────────────────────────────────────────────── */

/**
 * Mark and wordmark, matching the accent-soft plate the onboarding slides use
 * for their icon badges.
 */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { colors } = useOnboardingTheme()

  return (
    <View className="flex-row items-center gap-2.5">
      <View
        className="items-center justify-center rounded-xl"
        style={{ width: 34, height: 34, backgroundColor: colors.accentSoft }}
      >
        <Ionicons name="flash" size={16} color={colors.accent} />
      </View>

      {compact ? null : (
        <Text className="text-[17px] font-bold" style={{ color: colors.text }}>
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
  const { colors } = useOnboardingTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className="size-10 items-center justify-center rounded-xl active:opacity-70"
      style={{ backgroundColor: colors.cardMuted }}
    >
      <Ionicons name={icon} size={19} color={colors.textSecondary} />

      {badge ? (
        <View
          className="absolute top-2 right-2.5 rounded-full"
          style={{
            width: 8,
            height: 8,
            backgroundColor: colors.accent,
            borderWidth: 2,
            borderColor: colors.cardMuted,
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

/**
 * The app header.
 *
 * The athlete's identity and the sign-out action are gone from here: sign-out
 * is a destructive action that belonged behind a deliberate choice, and it used
 * to sit one tap away from the home screen as a red pill. It now lives on the
 * "You" tab, next to the account it acts on.
 */
export function TopBar({ onPressNotifications, trailing }: TopBarProps) {
  const insets = useSafeAreaInsets()
  const { colors } = useOnboardingTheme()

  return (
    <View
      className="border-b px-4 pb-3"
      style={{
        // The safe-area inset is consumed here rather than by a spacer, so the
        // bottom border lands below the status bar instead of running behind it.
        paddingTop: Math.max(insets.top, 12),
        backgroundColor: colors.card,
        borderColor: colors.border,
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

/* ── Tab bar ────────────────────────────────────────────────────────────── */

export type TabKey = "home" | "maps" | "record" | "groups" | "you"

type TabItem = {
  key: TabKey
  label: string
  icon: IconName
  iconActive: IconName
}

/**
 * Tab order.
 *
 * "Record" sits in the middle and is drawn by `TabBar` itself rather than being
 * one more row entry, because it is an action that leaves the tab set — not
 * another place to be.
 */
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

/**
 * The bottom tab bar.
 *
 * Selection is carried by three signals at once — the accent glyph, the accent
 * word, and a tinted plate behind the icon — because a 10px label in the
 * inactive grey is the only difference otherwise, and that is easy to miss with
 * a thumb. The record button is the one saturated surface, matching the rule the
 * web and onboarding surfaces follow.
 */
export function TabBar({ activeTab, onSelect, onRecord }: TabBarProps) {
  const insets = useSafeAreaInsets()
  const { colors } = useOnboardingTheme()

  return (
    <View
      className="flex-row border-t px-2 pt-2"
      style={{
        paddingBottom: Math.max(insets.bottom, 10),
        backgroundColor: colors.card,
        borderColor: colors.border,
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
                color={isActive ? colors.accent : colors.textMuted}
              />
            </View>

            <Text
              className="mt-1 text-[10px] font-semibold"
              style={{ color: isActive ? colors.accentText : colors.textMuted }}
            >
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/**
 * The centre action.
 *
 * Lifted above the bar by half its height so it reads as floating, and ringed
 * in the page colour so the bar appears to pass behind it rather than being
 * interrupted by a floating circle.
 */
function RecordButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useOnboardingTheme()

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
          borderColor: colors.card,
        }}
      >
        <Ionicons name="reload-circle" size={26} color={colors.onAccent} />
      </View>

      <Text className="mt-1 text-[10px] font-semibold" style={{ color: colors.textMuted }}>
        {label}
      </Text>
    </Pressable>
  )
}