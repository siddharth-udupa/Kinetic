import { redirect } from "next/navigation"

/** The loop builder now opens over `/maps`; keep old links working. */
export default function RoutePlannerPage() {
  redirect("/maps")
}
