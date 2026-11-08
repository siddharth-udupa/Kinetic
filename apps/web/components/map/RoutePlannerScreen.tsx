"use client"

import { useState } from "react"
import MapView from "./Map"
import RoutePlanner from "./RoutePlanner"
import { useUserLocation } from "@/hooks/useUserLocation"

/** Owns the loop result and the precise start point: the planner needs the fix
 *  to build the request, and the map needs the same fix to draw its dot. */
export default function RoutePlannerScreen() {
  const [encodedPolyline, setEncodedPolyline] = useState<string>()
  const { location, status, request } = useUserLocation({ requestOnMount: true })

  return (
    <>
      <MapView
        encodedPolyline={encodedPolyline}
        isChangeable={true}
        userLocation={location}
      />
      <RoutePlanner
        userLocation={location}
        locationStatus={status}
        onRequestLocation={request}
        onRouteChange={(route) => setEncodedPolyline(route?.polyline)}
      />
    </>
  )
}
