"use client"

import { ArrowUp } from "lucide-react"
import Link from "next/link"
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import type { ActivityCardType, PreferencesType } from "@repo/types"

const ActivityCard = lazy(() => import("./ActivityCard"))

/** Matches the page size the dashboard and `/api/activities` use. */
const PAGE_SIZE = 5
/** Below this scroll offset the back-to-top control is noise. */
const BACK_TO_TOP_AFTER = 480

export default function ActivityFeed({ initialActivities, userPreferences, userId, userName, userImage }: {
  initialActivities: ActivityCardType[],
  userPreferences: PreferencesType,
  userId: string,
  userName: string,
  userImage?: string | null
}) {

  const [activities, setActivities] = useState(initialActivities)
  const [page, setPage] = useState(1)
  // A short first page is the whole feed, so there is nothing to fetch. This
  // skips the extra request (and its spinner) for a new account.
  const [hasMore, setHasMore] = useState(initialActivities.length >= PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)


  const fetchMore = useCallback(async () => {
    // The observer can fire again before React commits `loading`, so the ref is
    // the guard that actually prevents a duplicate page request.
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setFailed(false)

    try {
      const res = await fetch(`/api/activities?userId=${userId}&page=${page}&limit=${PAGE_SIZE}`)
      if (!res.ok) throw new Error(`Activities request failed (${res.status})`)

      const data: ActivityCardType[] = await res.json()

      if (!Array.isArray(data) || data.length === 0) {
        setHasMore(false)
      }
      else {
        setActivities((prev) => [...prev, ...data])
        setPage((prev) => prev + 1)
      }
    } catch {
      // Leave `hasMore` true so the retry button can try the same page again,
      // but stop the observer from retrying in a loop.
      setFailed(true)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [userId, page])


  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading && !failed) {
        fetchMore()
      }
    },
      { threshold: 0.1 }  // trigger when div is 10% visible
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [fetchMore, hasMore, loading, failed])


  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > BACK_TO_TOP_AFTER)

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])


  function scrollToTop() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
  }


  if (activities.length === 0) {
    if (hasMore) {
      return (
        <div className="mx-auto my-4 w-[calc(100%-1.5rem)] max-w-xl sm:my-5 sm:w-[calc(100%-2.5rem)]">
          <div className="flex h-80 items-center justify-center rounded-2xl border border-line bg-surface-muted/70">
            <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
              <div className="size-7 animate-spin rounded-full border-2 border-line border-t-accent" />
              <span className="text-xs font-semibold text-ink-muted">Loading activities</span>
            </div>
          </div>
        </div>
      )
    }

    if (failed) {
      return (
        <div className="mx-auto my-4 w-[calc(100%-1.5rem)] max-w-xl rounded-2xl border border-line bg-surface px-6 py-12 text-center sm:my-5 sm:w-[calc(100%-2.5rem)]">
          <p className="text-sm font-semibold text-ink">Couldn&apos;t load activities</p>
          <button
            type="button"
            onClick={fetchMore}
            className="mt-4 rounded-xl border border-line-strong bg-surface-muted px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-muted-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Try again
          </button>
        </div>
      )
    }

    return (
      <div className="mx-auto my-4 w-[calc(100%-1.5rem)] max-w-xl rounded-2xl border border-line bg-surface px-6 py-12 text-center sm:my-5 sm:w-[calc(100%-2.5rem)]">
        <p className="text-base font-bold text-ink">No activities yet</p>
        <p className="mt-1.5 text-sm text-ink-muted">
          Log your first run, ride or hike to start your feed.
        </p>
        <Link
          href="/upload"
          className="mt-5 inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
        >
          Log an activity
        </Link>
      </div>
    )
  }


  return (
    <div className="bg-page pb-16">
      {activities.map((a) => (
        <Suspense key={a.activityId} fallback={<div className="my-4 p-4 sm:my-5 md:p-5 mx-auto w-[calc(100%-1.5rem)] max-w-xl bg-surface-muted/70 border border-line rounded-2xl h-80 animate-pulse sm:w-[calc(100%-2.5rem)]" />}>
          <ActivityCard activities={a} userPreferences={userPreferences} userName={userName} userImage={userImage} />
        </Suspense>
      ))}

      <div ref={sentinelRef} className="h-1" />

      {/* Explicit ink — these would otherwise inherit the browser's default black. */}
      {loading && (
        <div className="flex items-center justify-center py-6" role="status" aria-live="polite">
          <span className="sr-only">Loading more activities</span>
          <span
            aria-hidden
            className="size-6 animate-spin rounded-full border-2 border-line border-t-accent"
          />
        </div>
      )}

      {failed && !loading && (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="text-sm font-medium text-ink-muted">Couldn&apos;t load more activities.</p>
          <button
            type="button"
            onClick={fetchMore}
            className="rounded-xl border border-line-strong bg-surface-muted px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-muted-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Try again
          </button>
        </div>
      )}

      {!hasMore && !failed && (
        <div className="flex flex-col items-center gap-2.5 px-4 pt-7 pb-2">
          <div className="flex w-full max-w-72 items-center gap-3">
            <span className="h-px flex-1 bg-line-strong" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-[0.26em] text-ink-muted">
              End
            </span>
            <span className="h-px flex-1 bg-line-strong" aria-hidden />
          </div>
          <p className="text-xs font-medium text-ink-muted">
            That&apos;s every activity — you&apos;re all caught up.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        className={`fixed bottom-5 left-4 z-40 flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink-secondary shadow-card transition hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95 sm:bottom-8 sm:left-6 ${
          showBackToTop ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        tabIndex={showBackToTop ? 0 : -1}
        aria-hidden={!showBackToTop}
      >
        <ArrowUp className="size-5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}
