import { Redirect } from "expo-router"
import { View, ActivityIndicator } from "react-native"
import { useSession } from "@/lib/auth-client"
import { usePreferences } from "@/lib/preferencesStore"
import { useTheme } from "@/hooks/useTheme"

export default function Index() {
  const { data: session, isPending } = useSession()
  const { status, preferences } = usePreferences()
  const { colors } = useTheme()

  if (isPending) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  if (!session) {
    return <Redirect href={"/(auth)/auth" as any} />
  }

  // "ready" means the answer came from the device copy, or from the one request
  // still owed on a device that has never seen this account.
  if (status !== "ready") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  // No preferences at all means the server was unreachable on a device with no
  // local copy. Onboarding can be completed or skipped either way.
  if (!preferences?.onBoarded) {
    return <Redirect href={"/(onboarding)" as any} />
  }

  return <Redirect href={"/(app)/dashboard" as any} />
}
