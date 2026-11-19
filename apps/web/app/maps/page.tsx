import MapsScreen from "@/components/map/MapsScreen"

export default async function Maps({
  searchParams,
}: {
  searchParams: Promise<{ planner?: string }>
}) {
  /* The nav's "Loop builder" entry opens the panel directly; the map and the
     planner now live on this one page. The key makes a change of intent remount
     the screen, so the panel opens even when `/maps` is already mounted. */
  const { planner } = await searchParams
  const wantsPlanner = planner === "1"
  return (
    <MapsScreen
      key={wantsPlanner ? "planner" : "map"}
      openPlanner={wantsPlanner}
    />
  )
}
