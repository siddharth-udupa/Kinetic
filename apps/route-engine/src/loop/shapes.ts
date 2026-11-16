import {
  countSelfIntersections,
  destination,
  distanceBetween,
  projectShape,
  type GeoPoint,
} from "../geo/index.js"
import {
  DETOUR_FACTOR_MAX,
  DETOUR_FACTOR_MIN,
  INTERSECTION_CLUSTER_METERS,
  INTERSECTION_GRID_METERS,
  INTERSECTION_TOUCH_ANGLE_DEGREES,
  INTERSECTION_TOUCH_METERS,
  MIN_VIA_RADIUS_METERS,
  SHAPE_STRETCH,
  SHAPE_WOBBLE,
} from "./config.js"
import type { CandidateSeed } from "./types.js"

type Template = {
  name: string
  vias: number
  weight: number
  sweepMin: number
  sweepMax: number
}

/**
 * Loop topologies. The origin is one vertex and the vias form the rest of the
 * polygon, with the sweep controlling how far around the start the loop wraps.
 * More vias make a rounder loop; two make a triangle.
 */
const TEMPLATES: Template[] = [
  { name: "triangle", vias: 2, weight: 0.3, sweepMin: 140, sweepMax: 200 },
  { name: "diamond", vias: 3, weight: 0.34, sweepMin: 160, sweepMax: 230 },
  { name: "pentagon", vias: 4, weight: 0.24, sweepMin: 180, sweepMax: 260 },
  { name: "hexagon", vias: 5, weight: 0.12, sweepMin: 210, sweepMax: 290 },
]

function lerp(min: number, max: number, fraction: number): number {
  return min + (max - min) * fraction
}

function normalizeBearing(bearing: number): number {
  return ((bearing % 360) + 360) % 360
}

/**
 * Straight-line perimeter of the control polygon as a multiple of the control
 * radius. The routed loop is longer than this, which the detour factor covers.
 */
function perimeterFactor(vias: number, sweepDegrees: number): number {
  const gap = (sweepDegrees * Math.PI) / 180 / (vias + 1)
  return 2 + 2 * (vias - 1) * Math.sin(gap / 2)
}

function templateCounts(total: number): number[] {
  const raw = TEMPLATES.map((template) => template.weight * total)
  const counts = raw.map((value) => Math.floor(value))
  let remainder = total - counts.reduce((sum, value) => sum + value, 0)

  const byFraction = raw
    .map((value, index) => ({ index, fraction: value - counts[index] }))
    .sort((a, b) => b.fraction - a.fraction)

  for (let index = 0; remainder > 0; index++, remainder--) {
    counts[byFraction[index % byFraction.length].index]++
  }

  return counts
}

function seedFromTemplate(
  template: Template,
  origin: GeoPoint,
  targetDistanceMeters: number,
  random: () => number,
  sequence: number
): CandidateSeed | null {
  // A handful of attempts keeps the control polygon simple without spending
  // any Valhalla calls. The failures are rare and cheap.
  for (let attempt = 0; attempt < 24; attempt++) {
    const bearing = random() * 360
    const sweepDegrees = lerp(
      template.sweepMin,
      template.sweepMax,
      random()
    )
    const detour = lerp(DETOUR_FACTOR_MIN, DETOUR_FACTOR_MAX, random())
    const radiusMeters =
      targetDistanceMeters /
      (perimeterFactor(template.vias, sweepDegrees) * detour)

    const stretch = (random() * 2 - 1) * SHAPE_STRETCH
    const wobble = (random() * 2 - 1) * SHAPE_WOBBLE
    const gap = sweepDegrees / (template.vias + 1)
    const vias: CandidateSeed["vias"] = []

    for (let index = 0; index < template.vias; index++) {
      const fraction = (index + 1) / (template.vias + 1)
      const angle =
        bearing +
        sweepDegrees * fraction +
        (random() * 2 - 1) * gap * 0.12
      const radial =
        radiusMeters *
        Math.max(
          0.1,
          1 +
            stretch * Math.sin(2 * Math.PI * fraction) +
            wobble * Math.sin(4 * Math.PI * fraction) +
            (random() * 2 - 1) * 0.03
        )

      if (radial < MIN_VIA_RADIUS_METERS) break

      vias.push({
        bearing: normalizeBearing(angle),
        radiusMeters: radial,
        point: destination(origin, angle, radial),
      })
    }

    if (vias.length !== template.vias) continue

    // Reject shapes whose own control polygon crosses itself. This is a
    // property of the seed, so no amount of routing can fix it. The route-scale
    // jog filters do not apply here: any crossing in a handful of control
    // points is degenerate.
    const controlShape = [origin, ...vias.map((via) => via.point), origin]
    if (
      countSelfIntersections(projectShape(controlShape), {
        cellSize: INTERSECTION_GRID_METERS,
        touchMeters: INTERSECTION_TOUCH_METERS,
        minTouchAngleDegrees: INTERSECTION_TOUCH_ANGLE_DEGREES,
        minTouchSeparationMeters: 0,
        clusterMeters: INTERSECTION_CLUSTER_METERS,
        closureExclusionMeters: 0,
      }) > 0
    ) {
      continue
    }

    const minSeparation = Math.max(40, targetDistanceMeters * 0.005)
    let tooClose = false
    for (let left = 0; left < vias.length && !tooClose; left++) {
      for (let right = left + 1; right < vias.length; right++) {
        if (
          distanceBetween(vias[left].point, vias[right].point) <
          minSeparation
        ) {
          tooClose = true
          break
        }
      }
    }
    if (tooClose) continue

    return {
      id: `${template.name}_${sequence}`,
      template: template.name,
      bearing: normalizeBearing(bearing),
      sweepDegrees,
      radiusMeters,
      vias,
      correction: 1,
    }
  }

  return null
}

export function generateCandidateSeeds(
  origin: GeoPoint,
  targetDistanceMeters: number,
  count: number,
  random: () => number
): CandidateSeed[] {
  const seeds: CandidateSeed[] = []
  const counts = templateCounts(count)
  let sequence = 0

  TEMPLATES.forEach((template, templateIndex) => {
    for (let index = 0; index < counts[templateIndex]; index++) {
      const seed = seedFromTemplate(
        template,
        origin,
        targetDistanceMeters,
        random,
        sequence++
      )
      if (seed) seeds.push(seed)
    }
  })

  // Route the shapes in a shuffled order so a budget cutoff still covers every
  // topology instead of dropping the last template entirely.
  for (let index = seeds.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1))
    const current = seeds[index]
    seeds[index] = seeds[swap]
    seeds[swap] = current
  }

  return seeds
}

/** Scales a seed's control points for a distance-correction request. */
export function scaleSeed(
  origin: GeoPoint,
  seed: CandidateSeed,
  factor: number
): CandidateSeed {
  const vias = seed.vias.map((via) => {
    const radiusMeters = via.radiusMeters * factor
    return {
      bearing: via.bearing,
      radiusMeters,
      point: destination(origin, via.bearing, radiusMeters),
    }
  })

  return {
    ...seed,
    id: `${seed.id}~${factor.toFixed(3)}`,
    radiusMeters: seed.radiusMeters * factor,
    vias,
    correction:
      seed.correction === 1 ? factor : seed.correction * factor,
  }
}
