import { Suspense } from "react"
import AuthScreen from "@/components/auth/AuthScreen"

/**
 * The auth form reads `callbackUrl` through `useSearchParams`, which needs a
 * Suspense boundary above it — the shell is rendered on its own so this stays
 * a host file rather than a second implementation.
 */
export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <span className="text-sm font-medium text-gray-400">Loading…</span>
        </div>
      }
    >
      <AuthScreen />
    </Suspense>
  )
}