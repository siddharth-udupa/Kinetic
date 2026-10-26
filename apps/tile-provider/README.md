# Tile provider

Cpeak service that puts HTTP in front of a local `.mbtiles` tileset, so MapLibre
can request `{z}/{x}/{y}` like any tile server.

Read-only by design: the `.mbtiles` file is a finished artefact from a tiling
pipeline (tilemaker, planetiler, …) and this service never writes to it, runs no
migrations, or accepts uploads. To change the map, rebuild the tileset and
restart.

SQLite access lives in `@repo/tiles` (`packages/tiles`) so the web/mobile apps
can read tiles directly later without going through HTTP.

## Run

```bash
pnpm tiles
```

| Env var         | Default               | Purpose                                     |
| --------------- | --------------------- | ------------------------------------------- |
| `PORT`          | `4000`                | Port to listen on                           |
| `HOST`          | `0.0.0.0`             | Address to bind                             |
| `TILES_DB_PATH` | `./data/south-india.mbtiles` | The `.mbtiles` file to serve (read-only)    |

Boot fails with a plain message if the file is missing, is not an MBTiles file,
or the port is taken, rather than starting a server that 404s everything.

Cpeak has no dependencies and no logger of its own, so the service logs its
startup lines and unexpected failures through `console` and nothing else.

## Endpoints

| Method | Path                    | Notes                                       |
| ------ | ----------------------- | ------------------------------------------- |
| `GET`  | `/tiles/:z/:x/:y[.pbf]` | Tile bytes, or 404 if the tileset has none   |
| `GET`  | `/health`               | Format and zoom range of the served tileset  |
| `GET`  | `/metadata`             | Full metadata table, incl. vector layer list |

```bash
curl http://localhost:4000/health
curl http://localhost:4000/tiles/4/11/7.pbf -o tile.pbf
```

Responses carry an ETag (the tile coordinate) and an immutable
`cache-control`, and a matching `if-none-match` gets a 304. MBTiles stores rows
in TMS, so the Y flip is handled in the lookup — what you request is plain XYZ.
An invalid coordinate gets a 400 with the validation issues.

A `pbf` tile is served as the stored gzipped bytes with `content-encoding:
gzip`, which is what makes MapLibre unpack it before parsing, and every response
allows any origin so browser clients can read the tiles.

## Layout

Cpeak has no plugin system, so `src/routes/*.ts` export plain functions that
register their paths on the app handed to them, and `src/server.ts` owns the
error handler both of them rely on.

Two details are worth knowing before editing the routes:

- A `:param` matches a whole path segment, so `/tiles/:z/:x/:y` already answers
  `.pbf` requests. Registering a second `/tiles/:z/:x/:y.pbf` route collides in
  the router and throws at boot.
- Cpeak has helpers for JSON, files and compression, but none for raw bytes, so
  tile payloads are written straight onto the Node response with
  `res.setHeader()` and `res.end(buffer)`.

## Not done yet

- No auth. Reads are public anyway, so this only matters if the service is
  exposed publicly.
- One tileset at a time. Serving several (e.g. base + overlay) needs a lookup
  across files.
- No compression negotiation — the stored `pbf` bytes are already gzipped, and
  they are sent as-is, so Cpeak's compression is left off. Compressing them a
  second time would only cost CPU.
