# Route engine

Express 5 service that owns loop generation: a health endpoint, a typed Valhalla
client, the geometry primitives and `POST /loop`.

Valhalla is the routing graph in `services/valhalla`. This service is the only
thing that calls it; web and mobile reach it through the BFF, never Valhalla
directly.

## Run

From the repo root, `pnpm dev` starts all four workspace apps, including this
engine. Valhalla is a separate service; its graph is opt-in and must be running
on `:8002`:

```bash
docker compose --profile routing up -d valhalla
```

If Valhalla is not running, the engine still boots and `/health` reports it,
but every loop request returns `502`. There is deliberately no public fallback:
the 30-candidate batch would be rate-limited, and a shared instance should not
receive this traffic.

To run the engine on its own:

```bash
pnpm engine
```

`pnpm engine` is `pnpm --filter route-engine dev`, so it watches `src/` and
restarts on change. Production-ish start without the watcher:

```bash
pnpm --filter route-engine start
```

| Env var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8003` | Port to listen on |
| `HOST` | `127.0.0.1` | Loopback by default; the engine is not public |
| `VALHALLA_URL` | `http://localhost:8002` | Valhalla base URL |

Copy `.env.example` to `.env` to change a value. Keep `VALHALLA_URL` pointed at
a local graph; the engine has no public fallback.

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health` | Proxies Valhalla `/status`; `200` when reachable, `503` when not |
| `POST` | `/loop` | Builds a loop; `400` invalid body, `422` no candidate, `502` Valhalla failure |

```bash
curl -s localhost:8003/health | jq
```

```json
{
  "status": "ok",
  "service": "route-engine",
  "valhalla": {
    "reachable": true,
    "version": "3.9.1-53821e16f",
    "tilesetLastModified": 1793105738,
    "latencyMs": 2
  }
}
```

Every response carries an `x-request-id`. An incoming `x-request-id` is reused
when it is 128 characters or fewer of `[A-Za-z0-9._:-]`, otherwise a UUID is
generated. The same id is sent to Valhalla and appears in the engine's
`[valhalla]` log line.

### `POST /loop`

```bash
curl -s localhost:8003/loop \
  -H 'content-type: application/json' \
  -d '{
    "origin": { "lat": 12.9716, "lon": 77.5946 },
    "distanceMeters": 10000,
    "profile": "bike",
    "seed": 48213
  }' | jq
```

```json
{
  "seed": 48213,
  "profile": "bike",
  "requestedDistanceMeters": 10000,
  "distanceMeters": 10461,
  "durationSeconds": 2227,
  "elevationGainMeters": 35,
  "accuracy": 0.0461,
  "loopiness": 0.2936,
  "polyline": "{odnA}erxM…",
  "routes": [
    {
      "rank": 1,
      "distanceMeters": 10461,
      "durationSeconds": 2227,
      "elevationGainMeters": 35,
      "accuracy": 0.0461,
      "loopiness": 0.2936,
      "repeatedRoadPercent": 2,
      "repeatedRoadMeters": 210,
      "selfIntersections": 0,
      "sharpTurns": 3,
      "uTurns": 1,
      "score": 0.1875,
      "polyline": "{odnA}erxM…"
    }
  ],
  "warnings": []
}
```

The payload is trimmed to one route and the polylines are shortened; the same
10 km request returns three routes from this start point.

`distanceMeters` is clamped to 1–80 km. `profile` is `bike` or `foot`. `seed`
is an optional 32-bit integer; omit it and the engine picks one, echoes it back
and the same preferences rebuild the same loop.

`routes` is the ranked result, best first and capped at three. Every route in
the list passed the quality gates and is distinct from the others, except for
the single fallback described below. The top-level `distanceMeters`,
`durationSeconds`, `elevationGainMeters`, `accuracy`, `loopiness` and `polyline`
mirror `routes[0]` so existing clients keep rendering one loop until they move
to the list.

### How the loop is built

The engine generates 30 control-point seeds per request. Four topologies are
used in fixed proportions — 9 triangles, 10 diamonds, 7 pentagons and 4
hexagons — so a request samples several road networks rather than rotating one
shape. A seed is discarded before routing if its control polygon crosses itself
or if two vias fall too close together. Each via is snapped with a tight radius
proportional to the loop (60–150 m) so a control point cannot jump onto an
unrelated road.

Seeds are routed eight at a time. Each result is measured five ways:

- **Distance error** — absolute difference from the requested distance, as a
  fraction of the target.
- **Repeated road** — the route is sampled every 10 m and compared with samples
  at least 40 m earlier along the route. Two samples within 14 m whose headings
  are parallel or anti-parallel within 35° are the same road. The result is a
  distance and a fraction of the loop.
- **Self-intersections** — a spatial hash finds non-adjacent legs that properly
  cross, or that meet within 2 m at a shared endpoint or at an angle of at least
  25°. A mid-route return through the exact start/finish counts even when the
  join is tangent, so two lobes joined at the closure are rejected. Short jogs
  through one junction and legs that overlap the same road for more than a few
  metres are ignored (the first is noise, the last is repeated road), as are
  other touches within 50 m of the start/finish. Nearby crossings are clustered
  within 20 m.
- **Compactness** — Polsby-Popper compactness, `4πA / P²`. A circle is `1`, an
  out-and-back is `0`.
- **Turns** — heading is measured over 15, 30 and 60 m windows on both sides of
  each 5 m sample. A change of at least 120° is a sharp turn and 150° is a
  U-turn; samples through one bend are grouped with a 40 m cooldown.

A candidate is rejected when any metric is outside its gate: more than 20%
distance error, more than 12% repeated road, any real self-intersection,
compactness below 0.18, more than 5 U-turns or 20 sharp turns per 10 km. The
gates reject figure-eights, overlapping out-and-back stems and routes that would
spend the ride turning around.

If fewer than three distinct routes survive, or one of the best three is more
than 8% off the target, the engine makes one correction pass. Up to four
otherwise-clean near misses have their seed radius scaled by
`target / actual`, clamped to 0.6–1.6, and are routed again. The corrected
routes compete with the originals.

Survivors are ranked by a weighted score: 34% distance error, 30% repeated
road, 14% self-intersections, 12% compactness, 6% U-turns and 4% sharp turns.
Lower is better. Two routes within 6% of the same length that cover 65% of the
shorter route's ground are treated as the same route, so the response never
contains three copies of one loop.

The request budget is 25 s and 40 Valhalla calls, with a 10 s timeout per call.
A local instance finishes far inside that. If the budget or the call count runs
out, the routes found so far are returned with a warning. If Valhalla starts
failing as a service — a full wave of `429`, `5xx`, timeout or connection
errors — the batch stops at once and the endpoint returns `502` with the
Valhalla error, rather than reporting `no_candidate` after spending the whole
budget. A refinement pass that fails this way is ignored so the candidates that
already routed are still returned. If no candidate clears every gate, the best
usable fallback is returned alone with a warning; if even that does not exist,
the endpoint returns `422` with `code: "no_candidate"`.

Candidates are discarded before scoring when they cross a ferry, when a
through-via snaps more than 180 m from where it was requested, when the route
does not return to its start within 50 m, or when the routed distance is less
than half or more than twice the target.

## The triangle check

A quick end-to-end check against a live Valhalla. It routes the same
origin → two `through` vias → origin triangle used to validate the graph,
decodes the returned polyline and prints the numbers that matter:

```bash
pnpm --filter route-engine triangle
```

```text
Valhalla triangle check
  request id    2c4e3128-… (233 ms)
  legs          1
  distance      8.63 km from shape (Valhalla summary 8.63 km, 0.1% apart)
  shape         1506 chars → 397 points
  closure       0.0 m between first and last point
  vias          via 1 4.8 m from shape, via 2 13.3 m from shape
  elevation     289 samples, 908–943 m
  area          1.34 km² · loopiness 0.226 (1 = circle, 0 = out-and-back)
  destination   1500 m at 0° lands 1.1 m from via 1
```

`loopiness` is Polsby-Popper compactness, `4πA / P²`. It compares the enclosed
area with the perimeter: a circle is `1`, a straight out-and-back is `0`. It is
a cheap shape score for candidate loops and needs no extra routing calls.

## Layout

| File | Purpose |
| --- | --- |
| `src/index.ts` | Boots the HTTP server |
| `src/env.ts` | Environment parsing |
| `src/server/` | Express app, request ids, routes and error handling |
| `src/valhalla/` | Typed `/route` and `/status` client |
| `src/geo/` | `destination`, `decodePolyline6`, shape metrics and loop analysis |
| `src/loop/` | Seed generation, batch routing, quality gates, correction and the time budget |
| `src/scripts/triangle.ts` | End-to-end check against a live Valhalla |

### Three details worth knowing

- **Valhalla shapes are polyline6.** `@repo/gpx`'s `decodePolyline` is hardcoded
  to 1e5, which turns 12.97 into 129.7. `decodePolyline6` exists for that reason;
  do not swap it for the shared decoder without adding a precision parameter.
- **`trip.locations` echoes the request.** It does not contain the snapped
  coordinates, so a via cannot be validated from the response. `distanceToShape`
  measures the requested via against the decoded route geometry instead, which
  also catches a via that snapped far from where it was asked to be.
- **Valhalla returns HTTP errors as JSON.** The client turns them into a typed
  `ValhallaError` with the request id and original body, so callers never parse
  Valhalla's error shape themselves.

## Next

The web UI at `/maps/route` and the mobile map screen post to the BFF and draw
the returned polyline. They currently read the top-level mirror of `routes[0]`;
the next step is showing the three ranked options and letting the rider pick a
start point. The engine already accepts any `origin`, so that is a UI change
rather than an algorithm one.
