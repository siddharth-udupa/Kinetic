import RoutePlannerScreen from "@/components/map/RoutePlannerScreen"
import { APP_NAME } from "@repo/shared"

export const metadata = {
  title: `Plan a loop · ${APP_NAME}`,
}

export default function RoutePlannerPage() {
  /* Same shell height as `/maps`: the map fills the viewport below the header
     and the preference panel floats over it. */
  return (
    <main className="relative h-[calc(100dvh-var(--shell-header-h))] w-full">
      <RoutePlannerScreen />
    </main>
  )
}
