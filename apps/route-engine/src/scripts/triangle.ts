import {
  decodePolyline6,
  destination,
  distanceBetween,
  distanceToShape,
  loopiness,
  shapeLength,
  shoelaceArea,
} from "../geo/index.js"
import { route, type ValhallaRouteRequest } from "../valhalla/index.js"

// The triangle that was used to prove the two-via mechanic against Valhalla.
// Origin is MG Road; both vias are `through` so the trip stays one leg.
const origin = { lat: 12.9716, lng: 77.5946 }
const vias = [
  { lat: 12.9851, lng: 77.5946 },
  { lat: 12.9649, lng: 77.6066 },
]
const throughRadius = 300

function formatDistance(meters: number): string {
  return meters >= 1_000
    ? `${(meters / 1_000).toFixed(2)} km`
    : `${meters.toFixed(1)} m`
}

async function main() {
  const request = {
    locations: [
      { lat: origin.lat, lon: origin.lng },
      ...vias.map((via) => ({
        lat: via.lat,
        lon: via.lng,
        type: "through" as const,
        radius: throughRadius,
      })),
      { lat: origin.lat, lon: origin.lng },
    ],
    costing: "bicycle",
    units: "kilometers",
    directions_type: "none",
    elevation_interval: 30,
  } satisfies ValhallaRouteRequest

  const { trip, requestId, durationMs } = await route(request)
  const leg = trip.legs[0]
  const shape = decodePolyline6(leg.shape)

  if (shape.length < 2) {
    throw new Error(`Expected a route shape, got ${shape.length} point(s)`)
  }

  const measuredLength = shapeLength(shape)
  const summaryLength = trip.summary.length * 1_000
  const lengthDelta = summaryLength
    ? (Math.abs(measuredLength - summaryLength) / summaryLength) * 100
    : 0

  const area = shoelaceArea(shape)
  // Polsby-Popper compactness: 1 is a circle, 0 is an out-and-back.
  const shapeLoopiness = loopiness(area, measuredLength)

  const viaDistances = vias.map((via) =>
    distanceToShape({ lat: via.lat, lng: via.lng }, shape)
  )
  const elevation = leg.elevation ?? []
  const closure = distanceBetween(shape[0], shape[shape.length - 1])
  const destinationCheck = destination(origin, 0, 1_500)

  console.log("Valhalla triangle check")
  console.log(`  request id    ${requestId} (${durationMs.toFixed(0)} ms)`)
  console.log(`  legs          ${trip.legs.length}`)
  console.log(
    `  distance      ${formatDistance(measuredLength)} from shape ` +
      `(Valhalla summary ${formatDistance(summaryLength)}, ${lengthDelta.toFixed(1)}% apart)`
  )
  console.log(`  shape         ${leg.shape.length} chars → ${shape.length} points`)
  console.log(`  closure       ${formatDistance(closure)} between first and last point`)
  console.log(
    `  vias          ${viaDistances
      .map(
        (distance, index) =>
          `via ${index + 1} ${formatDistance(distance)} from shape`
      )
      .join(", ")}`
  )
  console.log(
    `  elevation     ${
      elevation.length > 0
        ? `${elevation.length} samples, ${Math.min(...elevation).toFixed(0)}–${Math.max(...elevation).toFixed(0)} m`
        : "absent from response"
    }`
  )
  console.log(
    `  area          ${(area / 1_000_000).toFixed(2)} km² · ` +
      `loopiness ${shapeLoopiness.toFixed(3)} (1 = circle, 0 = out-and-back)`
  )
  console.log(
    `  destination   1500 m at 0° lands ${formatDistance(
      distanceBetween(destinationCheck, vias[0])
    )} from via 1`
  )

  const furthestVia = Math.max(...viaDistances)
  if (furthestVia > throughRadius) {
    console.warn(
      `\nWarning: a via is ${formatDistance(furthestVia)} from the returned shape, ` +
        `further than the ${throughRadius} m snap radius.`
    )
  }
}

try {
  await main()
} catch (error) {
  const detail =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  console.error(`Triangle check failed — ${detail}`)
  process.exitCode = 1
}
