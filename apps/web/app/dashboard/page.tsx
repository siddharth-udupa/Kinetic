import ActivityFeed from "@/components/ActivityFeed"
import { auth } from "@/lib/auth"
import { createUserPreferences, getActivitiesByUser, getUserPreferences } from "@repo/db"
import { headers } from "next/headers"
import { redirect } from "next/navigation"


export default async function Dashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
    // The feed renders the session user's avatar. Read it from the database
    // rather than the cookie cache, which can predate the avatar being set.
    query: { disableCookieCache: true },
  })
  if (!session) {
    redirect("/auth")
  }

  const { id: userId , name: userName, image: userImage } = session.user

  const initialActivities = await getActivitiesByUser(session?.user.id, 5, 0)
  let userPreferences = await getUserPreferences(session?.user.id)

  if (!userPreferences) {
    userPreferences = await createUserPreferences(session.user.id)
  }

  return (
    <div className="bg-page">
      {initialActivities ? <ActivityFeed initialActivities={initialActivities} userPreferences={userPreferences} userId={userId} userName={userName} userImage={userImage} /> : <div className="p-4 text-center text-sm font-medium text-ink-muted">Something went wrong. Try again later</div>}
    </div>
  )
}

