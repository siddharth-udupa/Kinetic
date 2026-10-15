import { db } from "@repo/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@repo/db"
import { expo } from "@better-auth/expo"


export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification
    }
  }),
  emailAndPassword: {
    enabled: true
  },
  session: {
    cookieCache: {
      enabled: true,
      // Upper bound on how long a revoked session stays live, so keep it short.
      maxAge: 5 * 60,
      strategy: "compact"
    }
  },
  plugins: [
    expo()
  ],
  trustedOrigins: [
    "mobile://",
    "exp://",
    process.env.EXPO_PUBLIC_API_URL ?? "",
  ].filter(Boolean),
  socialProviders: {
    google: {
      clientId: process.env.CLEINT_ID as string,
      clientSecret: process.env.CLEINT_SECRET as string,
    }
  }
})