"use client"

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import type { ActivityCardType, PreferencesType } from "@repo/types"

const ActivityCard = lazy(() => import("./ActivityCard"))

export default function ActivityFeed({ initialActivities, userPreferences, userId, userName, userImage }: {
  initialActivities: ActivityCardType[],
  userPreferences: PreferencesType,
  userId: string,
  userName: string,
  userImage?: string | null
}) {

  const [activities, setActivities] = useState(initialActivities)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)


  const fetchMore = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/activities?userId=${userId}&page=${page}&limit=5`)
    const data: ActivityCardType[] = await res.json()

    if (data.length === 0) {
      setHasMore(false)
    }
    else {
      setActivities((prev) => [...prev, ...data])
      setPage((prev) => prev + 1)
    }
    setLoading(false)
  }, [userId, page])


  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        fetchMore()
      }
    },
      { threshold: 0.1 }  // trigger when div is 10% visible
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [fetchMore, hasMore, loading])


  return (
    <div className="bg-page">
      {activities.map((a) => (
        <Suspense key={a.activityId} fallback={<div className="my-6 p-4 md:p-5 mx-auto w-full max-w-xl bg-surface-muted/70 border border-line rounded-xl h-96 animate-pulse" />}>
          <ActivityCard activities={a} userPreferences={userPreferences} userName={userName} userImage={userImage} />
        </Suspense>
      ))}

      <div ref={sentinelRef} className="h-1" />

      {/* Explicit ink — these would otherwise inherit the browser's default black. */}
      {loading && (
        <p className="py-4 text-center text-sm font-medium text-ink-muted">Loading more activities</p>
      )}
      {!hasMore && (
        <p className="py-4 text-center text-sm font-medium text-ink-muted">You&apos;ve seen all activities</p>
      )}
    </div>
  )
}