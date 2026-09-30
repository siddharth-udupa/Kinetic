import AuthScreen from "@/components/ui/auth/AuthScreen"

/**
 * Thin host so the screen itself lives beside the other auth surfaces and can
 * be diffed against the web implementation.
 */
export default function AuthRoute() {
  return <AuthScreen />
}