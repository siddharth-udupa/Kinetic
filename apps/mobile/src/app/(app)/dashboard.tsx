import { useState, Suspense, lazy } from "react"
import { View, Text, ScrollView, StatusBar, ActivityIndicator, Pressable } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession, signOut } from "@/lib/auth-client"
import { Redirect, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import ActivityFeed from "@/components/ActivityFeed"
import { useActivities } from "@/hooks/useActivities"
import { clearPreferences } from "@/lib/preferencesStore"
import { useTheme } from "@/hooks/useTheme"
import { TabBar, TopBar, type TabKey } from "@/components/ui/shell/Navigation"

// The map bundle is large and only the maps tab needs it.
const LazyMapScreen = lazy(() => import("@/components/MapScreen"))

export default function DashboardScreen() {
  const { data: session } = useSession()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isDark, colors } = useTheme()
  const [activeTab, setActiveTab] = useState<TabKey>("home")

  // The feed refetches whenever this screen regains focus.
  const { activities, isLoading, refreshing, error, refetch } = useActivities(session?.user.id)

  if (!session) {
    return <Redirect href={"/(auth)/sign-in" as any} />
  }

  // Bottom bar height: pt-2 (8) + plate (32) + label (13 + 4 margin) + bottom inset
  const bottomBarHeight = 57 + Math.max(insets.bottom, 10)

  return (
    <View className="flex-1" style={{ backgroundColor: colors.page }}>
      {/* Follows the resolved theme: a pinned `dark-content` puts dark glyphs on a dark bar. */}
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <TopBar />

      {/* DYNAMIC TAB CONTENT */}
      {activeTab === "home" && (
        <ActivityFeed
          user={session.user}
          activities={activities}
          isLoading={isLoading}
          refreshing={refreshing}
          onRefresh={refetch}
          error={error}
          contentContainerStyle={{ paddingBottom: bottomBarHeight + 16 }}
        />
      )}

      {activeTab === "maps" && (
        <Suspense
          fallback={
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" />
            </View>
          }
        >
          <LazyMapScreen insets={insets} />
        </Suspense>
      )}

      {activeTab === "you" ? (
        <AccountTab user={session.user} />
      ) : null}

      {activeTab !== "home" && activeTab !== "maps" && activeTab !== "you" ? (
        <PlaceholderTab tab={activeTab} />
      ) : null}

      {/* BOTTOM TAB BAR — in flow rather than absolutely positioned, so the
          content above it is never hidden underneath it. */}
      <TabBar
        activeTab={activeTab}
        onSelect={setActiveTab}
        onRecord={() => router.push("/(app)/recorder/recorder" as any)}
      />
    </View>
  )
}

/** The account tab. Sign-out sits under the profile it acts on, as a full-width
 *  row, so the consequence of the tap is legible before it happens. */
function AccountTab({ user }: { user: { name?: string | null; email?: string | null; image?: string | null } }) {
  const { colors } = useTheme()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    await signOut()
    // Drop the in-memory snapshot so the next account never sees this one's units.
    clearPreferences()
  }

  return (
    <ScrollView className="flex-1">
      <View className="px-4 pt-6 pb-10">
        <View
          className="flex-row items-center gap-4 rounded-2xl border p-5"
          style={{ backgroundColor: colors.surface, borderColor: colors.line }}
        >
          <View
            className="size-14 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.accentSoft }}
          >
            <Ionicons name="person" size={26} color={colors.accent} />
          </View>

          <View className="flex-1">
            <Text className="text-[17px] font-bold" style={{ color: colors.ink }}>
              {user.name || "Athlete"}
            </Text>
            <Text className="mt-1 text-[13px]" style={{ color: colors.inkMuted }}>
              {user.email}
            </Text>
          </View>
        </View>

        <Text
          className="mt-7 mb-2.5 text-[11px] font-semibold uppercase"
          style={{ color: colors.inkMuted, letterSpacing: 1.4 }}
        >
          Session
        </Text>

        <View
          className="overflow-hidden rounded-2xl border"
          style={{ backgroundColor: colors.surface, borderColor: colors.line }}
        >
          {/*
            Preferences have no screen yet — onboarding is the only place units
            and theme change. The row is left out until there is a route for it.
          */}

          <Pressable
            onPress={handleSignOut}
            disabled={isSigningOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            accessibilityState={{ disabled: isSigningOut, busy: isSigningOut }}
            className="flex-row items-center gap-3 px-4 py-4 active:opacity-70"
          >
            <Ionicons name="log-out-outline" size={19} color={colors.danger} />
            <Text className="flex-1 text-[15px] font-medium" style={{ color: colors.danger }}>
              {isSigningOut ? "Signing out…" : "Sign out"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

/** A tab with no screen yet — the real tabs minus the content. */
function PlaceholderTab({ tab }: { tab: TabKey }) {
  const { colors } = useTheme()
  const label = tab.charAt(0).toUpperCase() + tab.slice(1)

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="mb-4 size-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: colors.accentSoft }}
      >
        <Ionicons name="construct-outline" size={28} color={colors.accent} />
      </View>

      <Text className="text-[17px] font-bold" style={{ color: colors.ink }}>
        {label}
      </Text>
      <Text className="mt-1.5 text-[14px] text-center" style={{ color: colors.inkMuted }}>
        This view is still being built.
      </Text>
    </View>
  )
}