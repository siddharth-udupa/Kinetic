import { Redirect, Stack } from "expo-router"
import { ActivityIndicator, View } from "react-native"
import { useSession } from "@/lib/auth-client"
import { useTheme } from "@/hooks/useTheme"

export default function AppLayout() {
  const { data: session, isPending } = useSession()
  const { colors } = useTheme()

  // Gated here rather than per screen, so a protected screen never mounts
  // unauthenticated and never fires a doomed request.
  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-page">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  if (!session) {
    return <Redirect href={"/(auth)/auth" as any} />
  }

  return <Stack screenOptions={{ headerShown: false, statusBarStyle: "auto" }} />
}
