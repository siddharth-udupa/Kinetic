import { Suspense } from "react"
import AuthScreen from "@/components/auth/AuthScreen"

/** `AuthScreen` reads `callbackUrl` through `useSearchParams`, which needs a
 *  Suspense boundary above it. */
export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-page">
          <span className="text-sm font-medium text-ink-disabled">Loading…</span>
        </div>
      }
    >
      <AuthScreen />
    </Suspense>
  )
}