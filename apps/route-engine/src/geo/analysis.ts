import type { GeoPoint } from "./types.js"

const EARTH_RADIUS_METERS = 6_371_000
const METERS_PER_DEGREE = (Math.PI / 180) * EARTH_RADIUS_METERS

export type ProjectedPoint = {
  x: number
  y: number
}

export type ProjectedShape = {
  points: ProjectedPoint[]
  /** Distance from the start to `points[i]`, in metres. */
  cumulative: number[]
  length: number
}

export type RouteSample = ProjectedPoint & {
  distance: number
  /** Direction of travel at the sample, in radians. */
  heading: number
}

function key(x: number, y: number): string {
  return `${x},${y}`
}

/**
 * Projects a shape onto a local equirectangular plane at its mean latitude.
 * At loop scale the error is far below one percent, and every metric below is
 * cheaper and easier to reason about in metres than in degrees.
 */
export function projectShape(shape: GeoPoint[]): ProjectedShape {
  if (shape.length === 0) {
    return { points: [], cumulative: [], length: 0 }
  }

  let meanLat = 0
  let meanLng = 0
  for (const point of shape) {
    meanLat += point.lat
    meanLng += point.lng
  }
  meanLat /= shape.length
  meanLng /= shape.length

  const metersPerLng = METERS_PER_DEGREE * Math.cos((meanLat * Math.PI) / 180)
  const points = shape.map((point) => ({
    x: (point.lng - meanLng) * metersPerLng,
    y: (point.lat - meanLat) * METERS_PER_DEGREE,
  }))

  const cumulative = [0]
  for (let index = 1; index < points.length; index++) {
    cumulative.push(
      cumulative[index - 1] + Math.hypot(
        points[index].x - points[index - 1].x,
        points[index].y - points[index - 1].y
      )
    )
  }

  return {
    points,
    cumulative,
    length: cumulative[cumulative.length - 1],
  }
}

/**
 * Resamples a route at a fixed distance interval. Samples carry the heading of
 * the segment they landed on, which is what separates a genuine out-and-back
 * (parallel headings) from two roads that merely cross (perpendicular).
 */
export function sampleShape(
  projected: ProjectedShape,
  stepMeters: number
): RouteSample[] {
  const { points, cumulative, length } = projected
  if (points.length < 2 || length <= 0) return []

  const step = Math.max(1, stepMeters)
  const samples: RouteSample[] = []
  let segment = 0
  let distance = 0

  while (distance <= length) {
    while (
      segment < points.length - 2 &&
      cumulative[segment + 1] <= distance
    ) {
      segment++
    }

    const start = points[segment]
    const end = points[segment + 1]
    const segmentStart = cumulative[segment]
    const segmentLength = cumulative[segment + 1] - segmentStart
    const fraction =
      segmentLength === 0 ? 0 : (distance - segmentStart) / segmentLength
    const heading =
      segmentLength === 0
        ? (samples[samples.length - 1]?.heading ?? 0)
        : Math.atan2(end.y - start.y, end.x - start.x)

    samples.push({
      x: start.x + (end.x - start.x) * fraction,
      y: start.y + (end.y - start.y) * fraction,
      distance,
      heading,
    })

    distance += step
  }

  const last = samples[samples.length - 1]
  const final = points[points.length - 1]

  if (last && length - last.distance <= 0.5) {
    last.x = final.x
    last.y = final.y
    last.distance = length
  } else {
    const previous = points[points.length - 2]
    samples.push({
      x: final.x,
      y: final.y,
      distance: length,
      heading: Math.atan2(final.y - previous.y, final.x - previous.x),
    })
  }

  return samples
}

function angleDifference(a: number, b: number): number {
  let difference = Math.abs(a - b) % (2 * Math.PI)
  if (difference > Math.PI) difference = 2 * Math.PI - difference
  return difference
}

export type OverlapOptions = {
  stepMeters: number
  /** Two samples closer than this are on the same piece of road. */
  proximityMeters: number
  /** Ignore samples close together along the route; only a later pass
   *  counts. */
  minSeparationMeters: number
  /** A crossing road is not repeated; only same/opposite headings count. */
  maxAngleDegrees: number
}

export type OverlapResult = {
  repeatedMeters: number
  repeatedFraction: number
}

/**
 * Measures how much of a route retraces an earlier part of itself.
 *
 * The route is sampled every few metres and each sample is compared with
 * earlier samples that are at least `minSeparationMeters` back along the
 * route. A sample is repeated when it is within `proximityMeters` of one of
 * those samples *and* the two headings are parallel or anti-parallel. The
 * heading check is what stops an ordinary intersection from being counted as
 * overlap.
 */
export function analyseOverlap(
  projected: ProjectedShape,
  options: OverlapOptions
): OverlapResult {
  const samples = sampleShape(projected, options.stepMeters)
  if (samples.length < 2 || projected.length <= 0) {
    return { repeatedMeters: 0, repeatedFraction: 0 }
  }

  const cellSize = Math.max(1, options.proximityMeters)
  const proximitySq = options.proximityMeters * options.proximityMeters
  const parallelLimit = Math.sin(
    (options.maxAngleDegrees * Math.PI) / 180
  )
  const grid = new Map<string, number[]>()
  const repeated = new Uint8Array(samples.length)

  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index]
    const cellX = Math.floor(sample.x / cellSize)
    const cellY = Math.floor(sample.y / cellSize)

    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        const bucket = grid.get(key(cellX + offsetX, cellY + offsetY))
        if (!bucket) continue

        for (const earlierIndex of bucket) {
          const earlier = samples[earlierIndex]

          if (
            sample.distance - earlier.distance <
            options.minSeparationMeters
          ) {
            continue
          }

          const dx = sample.x - earlier.x
          const dy = sample.y - earlier.y
          if (dx * dx + dy * dy > proximitySq) continue

          if (
            Math.abs(
              Math.sin(angleDifference(sample.heading, earlier.heading))
            ) <= parallelLimit
          ) {
            repeated[index] = 1
            break
          }
        }

        if (repeated[index] === 1) break
      }

      if (repeated[index] === 1) break
    }

    const bucketKey = key(cellX, cellY)
    const bucket = grid.get(bucketKey)
    if (bucket) {
      bucket.push(index)
    } else {
      grid.set(bucketKey, [index])
    }
  }

  let repeatedCount = 0
  for (const value of repeated) repeatedCount += value

  const repeatedMeters = Math.min(
    projected.length,
    repeatedCount * options.stepMeters
  )

  return {
    repeatedMeters,
    repeatedFraction: repeatedMeters / projected.length,
  }
}

function orientation(
  a: ProjectedPoint,
  b: ProjectedPoint,
  c: ProjectedPoint
): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

/** True only when the segments cross at an interior point. */
function properlyIntersects(
  a: ProjectedPoint,
  b: ProjectedPoint,
  c: ProjectedPoint,
  d: ProjectedPoint
): boolean {
  const d1 = orientation(a, b, c)
  const d2 = orientation(a, b, d)
  const d3 = orientation(c, d, a)
  const d4 = orientation(c, d, b)

  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  )
}

function intersectionPoint(
  a: ProjectedPoint,
  b: ProjectedPoint,
  c: ProjectedPoint,
  d: ProjectedPoint
): ProjectedPoint | null {
  const rx = b.x - a.x
  const ry = b.y - a.y
  const sx = d.x - c.x
  const sy = d.y - c.y
  const denominator = rx * sy - ry * sx
  if (Math.abs(denominator) < 1e-9) return null

  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denominator
  return { x: a.x + t * rx, y: a.y + t * ry }
}

function closestPointOnSegment(
  point: ProjectedPoint,
  a: ProjectedPoint,
  b: ProjectedPoint
): ProjectedPoint {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return a

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq
    )
  )
  return { x: a.x + t * dx, y: a.y + t * dy }
}

/**
 * Shared length of two nearly collinear legs. A merge or a repeated stem has a
 * real overlap; two loops that merely touch at a junction do not.
 */
function collinearOverlapMeters(
  a: ProjectedPoint,
  b: ProjectedPoint,
  c: ProjectedPoint,
  d: ProjectedPoint,
  minAngleSin: number,
  offsetMeters: number
): number {
  const rx = b.x - a.x
  const ry = b.y - a.y
  const rLength = Math.hypot(rx, ry)
  const sx = d.x - c.x
  const sy = d.y - c.y
  const sLength = Math.hypot(sx, sy)
  if (rLength === 0 || sLength === 0) return 0
  if (Math.abs(rx * sy - ry * sx) > minAngleSin * rLength * sLength) {
    return 0
  }

  const ux = rx / rLength
  const uy = ry / rLength
  const offset = Math.abs((c.x - a.x) * uy - (c.y - a.y) * ux)
  if (offset > offsetMeters) return 0

  const first = (c.x - a.x) * ux + (c.y - a.y) * uy
  const second = (d.x - a.x) * ux + (d.y - a.y) * uy
  const low = Math.max(0, Math.min(first, second))
  const high = Math.min(rLength, Math.max(first, second))
  return Math.max(0, high - low)
}

/**
 * Finds a non-adjacent self-touch within `touchMeters` where the legs meet at a
 * real angle. Road-graph routes often pass through the same junction twice with
 * identical vertices, and a figure-eight whose crossing lands on a vertex has
 * no proper interior crossing to find. An exact endpoint touch counts at any
 * angle so two tangent lobes are caught; a parallel near-miss is repeated road,
 * which `analyseOverlap` measures separately.
 */
function touchPoint(
  a: ProjectedPoint,
  b: ProjectedPoint,
  c: ProjectedPoint,
  d: ProjectedPoint,
  touchMeters: number,
  minAngleSin: number
): ProjectedPoint | null {
  const rx = b.x - a.x
  const ry = b.y - a.y
  const sx = d.x - c.x
  const sy = d.y - c.y
  const rLength = Math.hypot(rx, ry)
  const sLength = Math.hypot(sx, sy)
  if (rLength === 0 || sLength === 0) return null

  const angled =
    Math.abs(rx * sy - ry * sx) >= minAngleSin * rLength * sLength

  const touchSq = touchMeters * touchMeters
  const endpointsTouch =
    distanceSquared(a, c) <= touchSq ||
    distanceSquared(a, d) <= touchSq ||
    distanceSquared(b, c) <= touchSq ||
    distanceSquared(b, d) <= touchSq

  let bestDistance = touchSq
  let best: ProjectedPoint | null = null

  for (const [point, start, end] of [
    [a, c, d],
    [b, c, d],
    [c, a, b],
    [d, a, b],
  ] as const) {
    const closest = closestPointOnSegment(point, start, end)
    const distance = distanceSquared(point, closest)
    if (distance <= bestDistance) {
      bestDistance = distance
      best = {
        x: (point.x + closest.x) / 2,
        y: (point.y + closest.y) / 2,
      }
    }
  }

  if (!best) return null
  if (!angled && !endpointsTouch) return null
  return best
}

function distanceSquared(a: ProjectedPoint, b: ProjectedPoint): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

function segmentCells(
  a: ProjectedPoint,
  b: ProjectedPoint,
  cellSize: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  return {
    minX: Math.floor(Math.min(a.x, b.x) / cellSize),
    maxX: Math.floor(Math.max(a.x, b.x) / cellSize),
    minY: Math.floor(Math.min(a.y, b.y) / cellSize),
    maxY: Math.floor(Math.max(a.y, b.y) / cellSize),
  }
}

export type IntersectionOptions = {
  /** Spatial hash cell size. */
  cellSize: number
  /** Two legs this close that meet at an angle also count as a crossing. */
  touchMeters: number
  /** Near-parallel legs are repeated road, not a crossing. */
  minTouchAngleDegrees: number
  /** A touch between legs this close along the route is just a bend/jog. */
  minTouchSeparationMeters: number
  /** Crossings this close are one self-intersection, not several. */
  clusterMeters: number
  /** The route's own start/finish is not an intersection with itself. */
  closureExclusionMeters: number
}

/** A shared stretch shorter than this is a touch, not repeated road. */
const MIN_REPEATED_OVERLAP_METERS = 5

/**
 * True when the route travels along the same road at this point. A touch where
 * another leg overlaps this one is a merge/repeat, not a crossing; repeated
 * road has its own metric and should not be penalized twice.
 */
function repeatsRoadAt(
  points: ProjectedPoint[],
  point: ProjectedPoint,
  options: IntersectionOptions,
  minAngleSin: number
): boolean {
  const nearby: { index: number; a: ProjectedPoint; b: ProjectedPoint }[] = []
  const touchSq = options.touchMeters * options.touchMeters

  for (let index = 0; index < points.length - 1; index++) {
    const a = points[index]
    const b = points[index + 1]
    const closest = closestPointOnSegment(point, a, b)
    if (distanceSquared(point, closest) > touchSq) continue
    nearby.push({ index, a, b })
  }

  for (let left = 0; left < nearby.length; left++) {
    for (let right = left + 1; right < nearby.length; right++) {
      const first = nearby[left]
      const second = nearby[right]
      if (second.index - first.index <= 1) continue
      if (
        second.index === points.length - 2 &&
        first.index === 0
      ) {
        continue
      }

      const overlap = collinearOverlapMeters(
        first.a,
        first.b,
        second.a,
        second.b,
        minAngleSin,
        options.touchMeters
      )
      if (overlap > MIN_REPEATED_OVERLAP_METERS) return true
    }
  }

  return false
}

/**
 * Counts distinct places where the route crosses itself. Proper interior
 * crossings always count. A shared vertex or near-touch counts only when the
 * two legs meet at a real angle, are far apart along the route (so a short jog
 * through one junction is not a crossing), and are not just re-joining the same
 * road. A mid-route return to the start/finish is two lobes joined at the
 * closure, so it counts even when the join is tangent. Crossings are clustered
 * so one messy junction is one penalty.
 */
export function selfIntersectionPoints(
  projected: ProjectedShape,
  options: IntersectionOptions
): ProjectedPoint[] {
  const { points, cumulative } = projected
  const segmentCount = points.length - 1
  if (segmentCount < 3) return []

  const grid = new Map<string, number[]>()
  const crossings: ProjectedPoint[] = []
  const touches: {
    point: ProjectedPoint
    index: number
    otherIndex: number
  }[] = []
  const closure = points[0]
  const closureExclusionSq =
    options.closureExclusionMeters * options.closureExclusionMeters
  const minTouchAngleSin = Math.sin(
    (options.minTouchAngleDegrees * Math.PI) / 180
  )

  function isNearClosure(point: ProjectedPoint): boolean {
    return distanceSquared(point, closure) <= closureExclusionSq
  }

  for (let index = 0; index < segmentCount; index++) {
    const a = points[index]
    const b = points[index + 1]
    const cells = segmentCells(a, b, options.cellSize)

    for (let cellX = cells.minX; cellX <= cells.maxX; cellX++) {
      for (let cellY = cells.minY; cellY <= cells.maxY; cellY++) {
        const bucket = grid.get(key(cellX, cellY))
        if (!bucket) continue

        for (const otherIndex of bucket) {
          if (index - otherIndex <= 1) continue
          if (index === segmentCount - 1 && otherIndex === 0) continue

          const c = points[otherIndex]
          const d = points[otherIndex + 1]

          if (properlyIntersects(a, b, c, d)) {
            const point = intersectionPoint(a, b, c, d)
            if (point) crossings.push(point)
            continue
          }

          const point = touchPoint(
            a,
            b,
            c,
            d,
            options.touchMeters,
            minTouchAngleSin
          )
          if (!point) continue
          if (isNearClosure(point)) continue

          const separation = Math.abs(
            cumulative[index] - cumulative[otherIndex]
          )
          if (separation < options.minTouchSeparationMeters) continue
          touches.push({ point, index, otherIndex })
        }
      }
    }

    for (let cellX = cells.minX; cellX <= cells.maxX; cellX++) {
      for (let cellY = cells.minY; cellY <= cells.maxY; cellY++) {
        const bucketKey = key(cellX, cellY)
        const bucket = grid.get(bucketKey)
        if (bucket) {
          bucket.push(index)
        } else {
          grid.set(bucketKey, [index])
        }
      }
    }
  }

  for (const touch of touches) {
    if (repeatsRoadAt(points, touch.point, options, minTouchAngleSin)) {
      continue
    }
    crossings.push(touch.point)
  }

  // A closed route that passes through its own start/finish midway is two
  // lobes joined at the closure, even when the join is tangent and leaves no
  // transversal crossing to find. The first and last `closureExclusionMeters`
  // are skipped so the usual departure and arrival do not count.
  const closureTouchSq = options.touchMeters * options.touchMeters
  const closureEdge = Math.max(
    options.closureExclusionMeters,
    options.touchMeters
  )
  for (let index = 0; index < segmentCount; index++) {
    if (cumulative[index] < closureEdge) continue
    if (cumulative[index + 1] > projected.length - closureEdge) {
      break
    }

    const closest = closestPointOnSegment(
      closure,
      points[index],
      points[index + 1]
    )
    if (distanceSquared(closest, closure) <= closureTouchSq) {
      crossings.push(closure)
      break
    }
  }

  const clusters: ProjectedPoint[] = []
  const clusterSq = options.clusterMeters * options.clusterMeters

  for (const crossing of crossings) {
    if (
      clusters.some(
        (cluster) => distanceSquared(cluster, crossing) <= clusterSq
      )
    ) {
      continue
    }
    clusters.push(crossing)
  }

  return clusters
}

export function countSelfIntersections(
  projected: ProjectedShape,
  options: IntersectionOptions
): number {
  return selfIntersectionPoints(projected, options).length
}

export type TurnOptions = {
  stepMeters: number
  /** Heading is measured at each window before and after each sample. Multiple
   *  windows catch both tight junction reversals and wide loop-backs. */
  lookaheadsMeters: number[]
  sharpTurnDegrees: number
  uTurnDegrees: number
  /** Do not count every sample through one long bend as another turn. */
  cooldownMeters: number
}

export type TurnResult = {
  sharpTurns: number
  uTurns: number
  maxTurnDegrees: number
}

/**
 * Counts deliberate sharp turns rather than ordinary road curvature. Heading
 * is measured over several windows on either side of each sample, so a 90°
 * city corner stays normal while a reversal at a junction is counted. Samples
 * through one continuous bend are grouped into a single turn event, and the
 * event is classified by its sharpest moment.
 */
export function analyseTurns(
  projected: ProjectedShape,
  options: TurnOptions
): TurnResult {
  const samples = sampleShape(projected, options.stepMeters)
  if (samples.length < 5) {
    return { sharpTurns: 0, uTurns: 0, maxTurnDegrees: 0 }
  }

  const offsets = options.lookaheadsMeters.map((lookahead) =>
    Math.max(1, Math.round(lookahead / options.stepMeters))
  )

  let sharpTurns = 0
  let uTurns = 0
  let maxTurnDegrees = 0
  let eventActive = false
  let eventMax = 0
  let lastAboveThreshold = Number.NEGATIVE_INFINITY

  function finishEvent(): void {
    if (!eventActive) return
    sharpTurns++
    if (eventMax >= options.uTurnDegrees) uTurns++
    eventActive = false
    eventMax = 0
  }

  for (let index = 0; index < samples.length; index++) {
    const current = samples[index]
    let degrees = 0

    for (const offset of offsets) {
      const before = samples[index - offset]
      const after = samples[index + offset]
      if (!before || !after) continue

      const beforeHeading = Math.atan2(
        current.y - before.y,
        current.x - before.x
      )
      const afterHeading = Math.atan2(
        after.y - current.y,
        after.x - current.x
      )
      degrees = Math.max(
        degrees,
        (angleDifference(beforeHeading, afterHeading) * 180) / Math.PI
      )
    }

    maxTurnDegrees = Math.max(maxTurnDegrees, degrees)

    if (degrees >= options.sharpTurnDegrees) {
      if (
        !eventActive ||
        current.distance - lastAboveThreshold > options.cooldownMeters
      ) {
        finishEvent()
        eventActive = true
        eventMax = degrees
      } else {
        eventMax = Math.max(eventMax, degrees)
      }
      lastAboveThreshold = current.distance
    } else if (
      eventActive &&
      current.distance - lastAboveThreshold > options.cooldownMeters
    ) {
      finishEvent()
    }
  }

  finishEvent()

  return { sharpTurns, uTurns, maxTurnDegrees }
}
