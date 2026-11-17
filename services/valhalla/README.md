# Valhalla — local routing graph

The routing engine behind loop generation. `pnpm dev` starts it automatically
once the graph has been built, and keeps it running across host restarts.

The graph is built from the **same** `south-india.osm.pbf` the vector tiles are
built from, so routing and rendering agree at the edges of the region.

## Cost

| | |
| --- | --- |
| Download | ~1 GB of 30 m DEM tiles, first build only |
| Disk | 4.2 GB measured for this extract |
| Time | 13 min at 2 threads on this box |
| Serve RAM | ~100 MB RSS; the 1.1 GB tar is mmapped page cache |

This machine has 4 cores / 7 GB RAM. `VALHALLA_THREADS=2` is deliberate:
`valhalla_build_tiles` is the process that gets OOM-killed first. Raise it only
if a build survives.

## Build once

```bash
./services/valhalla/build.sh            # no-op if the tar exists
./services/valhalla/build.sh --force    # rebuild the graph
VALHALLA_THREADS=3 ./services/valhalla/build.sh
```

The script copies the PBF into `custom_files/`, builds tiles + admin/timezone
DBs + elevation, writes `valhalla_tiles.tar`, logs to `custom_files/build.log`,
then hands ownership back to you. It exits when the build finishes; nothing is
left running.

## Run

```bash
pnpm valhalla:up                       # start + wait for healthy
docker compose --profile routing logs -f valhalla
pnpm valhalla:down                     # stop it without touching the apps
```

Bound to `127.0.0.1:8002` only. The routing engine will reach it over the
compose network by the name `valhalla`, so this host binding can stay closed.

## Verify

```bash
curl -s localhost:8002/status | jq
```

Then a real bike route, MG Road to Koramangala (~5 km):

```bash
curl -s localhost:8002/route -d '{
  "locations": [
    {"lat": 12.9716, "lon": 77.5946},
    {"lat": 12.9352, "lon": 77.6245}
  ],
  "costing": "bicycle",
  "units": "kilometers",
  "directions_type": "none",
  "elevation_interval": 30
}' | jq '.trip.summary, (.trip.legs[0].elevation | length)'
```

Expect a non-null summary with `length` in the 5–7 km range and a non-empty
elevation array. If `elevation` is missing, the graph was built without DEM
data — rebuild with `--force` and keep `build_elevation=True`.

## Layout

```
custom_files/            # gitignored, ~8–12 GB
  south-india.osm.pbf    # copy of apps/tile-provider/data/south-india.osm.pbf
  valhalla_tiles.tar     # the graph — the artefact that matters
  valhalla.json          # generated config, rewritten on boot if keys changed
  admins.sqlite
  timezones.sqlite
  elevation_data/        # 30 m HGT tiles, decompressed (~1.5 GB)
  build.log
```

Only `valhalla_tiles.tar`, `valhalla.json` and `elevation_data/` are needed to
serve. The rest can be regenerated.

## Refreshing OSM

Replace `custom_files/south-india.osm.pbf`, then:

```bash
./services/valhalla/build.sh --force
```

Keep `elevation_data/` — the rebuild reuses it and skips the 2 GB download.

## Pin the image

`latest` is convenient, not reproducible. Once a build succeeds, pin a version
tag in `compose.yaml` and in `VALHALLA_IMAGE`:

```bash
docker run --rm --entrypoint valhalla_service \
  ghcr.io/valhalla/valhalla-scripted:latest --version
```

## Next

The loop engine (`apps/route-engine`) will POST `/route` here. Nothing else in
the repo calls Valhalla directly.
