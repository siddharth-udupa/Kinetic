# Route engine

Express 5 service that owns loop generation. Step 2 is the skeleton only: a
health endpoint, a typed Valhalla client and the geometry primitives the
algorithm will use. There is no `/loop` endpoint yet.

Valhalla is the routing graph in `services/valhalla`. This service is the only
thing that calls it; web and mobile reach it through the BFF, never Valhalla
directly.

## Run

Start Valhalla first, then the engine:

```bash
docker compose --profile routing up -d valhalla
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

Copy `.env.example` to `.env` only if you need to change a value. When the
engine gets a compose entry, `VALHALLA_URL` is `http://valhalla:8002`.

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health` | Proxies Valhalla `/status`; `200` when reachable, `503` when not |

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

## The triangle check

This is the verification the algorithm will be built on. It routes the same
origin → two `through` vias → origin triangle used to validate the graph, decodes
the returned polyline and prints the numbers that matter:

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
| `src/server.ts` | Express app, request ids, error handling |
| `src/valhalla.ts` | Typed `/route` and `/status` client |
| `src/geo.ts` | `destination`, `decodePolyline6`, `distanceToShape`, `shapeLength`, `shoelaceArea` |
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

Step 3 adds the triangle generator and distance correction on top of these
primitives. It is intentionally not in this change.
