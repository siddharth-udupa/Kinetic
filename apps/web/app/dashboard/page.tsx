import ActivityFeed from "@/components/ActivityFeed"
import { auth } from "@/lib/auth"
import { createUserPreferences, getActivitiesByUser, getUserPreferences } from "@repo/db"
import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"


export default async function Dashboard() {
  const session = await auth.api.getSession({
    headers: await headers()
  })
  if (!session) {
    redirect("/auth")
  }

  const { id: userId , name: userName} = session.user

  const initialActivities = await getActivitiesByUser(session?.user.id, 5, 0)
  let userPreferences = await getUserPreferences(session?.user.id)

  if (!userPreferences) {
    userPreferences = await createUserPreferences(session.user.id)
  }

  return (
    <div className="bg-page">
      <div className="flex justify-end">
        <Link
          href={"/upload"}
          className="m-4 px-6 py-4 bg-accent text-on-accent text-xl rounded-xl"
        >Upload Activitiy</Link>
      </div>
      {initialActivities ? <ActivityFeed initialActivities={initialActivities} userPreferences={userPreferences} userId={userId} userName={userName} /> : <div className="p-4 text-center text-sm font-medium text-ink-muted">Something went wrong. Try again later</div>}
    </div>
  )
}

