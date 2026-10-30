"use client"

import { useState } from "react"
import MapView from "./Map"
import RoutePlanner from "./RoutePlanner"

/** Owns the loop result so the planner panel and the map share one route. */
export default function RoutePlannerScreen() {
  const [encodedPolyline, setEncodedPolyline] = useState<string>()

  return (
    <>
      <MapView encodedPolyline={encodedPolyline} isChangeable={true} />
      <RoutePlanner
        onRouteChange={(route) => setEncodedPolyline(route?.polyline)}
      />
    </>
  )
}
