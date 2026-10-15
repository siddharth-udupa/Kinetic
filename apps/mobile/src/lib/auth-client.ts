import { createAuthClient } from "better-auth/react"
import { expoClient } from "@better-auth/expo/client"
import * as SecureStore from "expo-secure-store"
import { AppState } from "react-native"

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL!,
  sessionOptions: {
    // Foregrounding is frequent (app switch, screen lock, biometric prompt) and must
    // not send a request every time. Revalidation is driven by the gate below.
    refetchOnWindowFocus: false,
    // No polling. The staleness gate covers it without burning battery.
    refetchInterval: 0,
    refetchWhenOffline: false,
  },
  plugins: [
    // @ts-expect-error — known type mismatch between better-auth and @better-auth/expo generics
    expoClient({
      scheme: "mobile",
      storagePrefix: "strava-clone",
      storage: SecureStore,
    }),
  ],
})

export const { signIn, signUp, signOut, useSession } = authClient

/** Revalidate on foreground only if the last successful check is older than this, matching the
 *  server's `session.cookieCache.maxAge` (apps/web/lib/auth.ts). */
const REVALIDATION_INTERVAL_MS = 5 * 60 * 1000

type SessionAtomValue = {
  data: unknown
  error: unknown
  isPending: boolean
  isRefetching: boolean
  refetch: (queryParams?: unknown) => Promise<void>
}

const sessionAtom = authClient.$store.atoms.session as unknown as {
  get: () => SessionAtomValue
  subscribe: (listener: (value: SessionAtomValue) => void) => () => void
}

/** Timestamp of the last session check that reached the server successfully. */
let lastVerifiedAt = 0

// Verification is recorded on the isRefetching true -> false edge. Failed checks
// do not count, so a transient network error cannot suppress the next revalidation.
let wasRefetching = false
sessionAtom.subscribe((value) => {
  if (value.isRefetching) {
    wasRefetching = true
    return
  }
  if (!wasRefetching) return
  wasRefetching = false
  if (!value.error) lastVerifiedAt = Date.now()
})

AppState.addEventListener("change", (state) => {
  if (state !== "active") return
  if (Date.now() - lastVerifiedAt < REVALIDATION_INTERVAL_MS) return

  const { isRefetching, data, refetch } = sessionAtom.get()
  // A settled null session means there is nothing to revalidate, and an
  // in-flight check already covers this foreground.
  if (isRefetching || data == null) return

  // lastVerifiedAt is advanced by the subscription above, on success only.
  // Bumping it here would let a failed check suppress the next revalidation.
  refetch()
})

export type User = typeof authClient.$Infer.Session.user
export type Session = typeof authClient.$Infer.Session
