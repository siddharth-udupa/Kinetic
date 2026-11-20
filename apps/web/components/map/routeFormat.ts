/** Shared formatting for the loop cards and the planner's success summary. */
export function formatDistance(meters: number): string {
  return `${(meters / 1_000).toFixed(1)} km`
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3_600)
  const minutes = Math.round((seconds % 3_600) / 60)

  if (hours === 0) return `${minutes} min`
  return `${hours} h ${minutes} min`
}
