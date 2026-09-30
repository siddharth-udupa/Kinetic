import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createUserPreferences } from "@repo/db"
import OnboardingFlow from "@/components/onboarding/OnboardingFlow"

export default async function OnBoarding() {
  const session = await auth.api.getSession({
    headers: await headers()
  })
  if (!session) redirect("/auth")

  const userPreferences = await createUserPreferences(session.user.id)

  if (userPreferences.onBoarded) redirect("/dashboard")

  return (
    <OnboardingFlow
      userName={(session.user.name ?? "").trim()}
      initialPrefs={{
        theme: userPreferences.theme,
        distanceUnit: userPreferences.distanceUnit,
        elevationUnit: userPreferences.elevationUnit,
        paceUnit: userPreferences.paceUnit,
        speedUnit: userPreferences.speedUnit,
        weightUnit: userPreferences.weightUnit,
        timeFormat: userPreferences.timeFormat,
      }}
    />
  )
}
