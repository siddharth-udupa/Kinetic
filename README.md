## Local development

```bash
pnpm dev
```

from the root. This starts all four workspace apps — web (`:3000`),
mobile/Metro (`:8081`), tile provider (`:4000`) and route engine (`:8003`) — in
parallel, plus the Valhalla routing server (`:8002`) in Docker. The script waits
for Valhalla to report healthy before starting the apps, so the engine does not
boot in a degraded state.

The route engine needs Valhalla, and Valhalla needs its graph built once:

```bash
./services/valhalla/build.sh
```

If the graph is missing or Docker is not running, `pnpm dev` stops with an
actionable message instead of starting a route engine that cannot route. Use
`pnpm dev:apps` to run only the workspace apps, and `pnpm valhalla:down` to stop
the routing container.

If Valhalla is not running, loop requests fail with a `502` naming the Valhalla
URL; the engine does not fall back to a public instance.

## Docker

`compose.yaml` runs the three local servers together:

| Service | URL | What it is |
| --- | --- | --- |
| `web` | http://localhost:3000 | Next.js app, API and Better Auth |
| `tiles` | http://localhost:4000 | Tile server for `apps/tile-provider/data/south-india.mbtiles` |
| `mobile` | http://localhost:8081 | Expo/Metro bundler and web preview |

```bash
pnpm compose:up      # docker compose up --build
pnpm compose:down    # docker compose down
```

The `.mbtiles` file is mounted read-only from `apps/tile-provider/data`; it is
not baked into the image. The tile server's health is at
http://localhost:4000/health and a sample tile at
http://localhost:4000/tiles/8/181/117.pbf.

The containers read `apps/web/.env` and `apps/mobile/.env` when those files
exist. Copy each `.env.example` if they are missing. For a physical phone, set
`REACT_NATIVE_PACKAGER_HOSTNAME` and the `EXPO_PUBLIC_*` URLs to your LAN IP and
restart `mobile` (Metro inlines those values when it bundles).

`apps/mobile` still ships through EAS; the container only runs its development
server so it can sit next to `web` and `tiles`.

The `web` service pins Docker DNS to `1.1.1.1` / `8.8.8.8`. If the host router
refuses the Neon hostname, containers otherwise fail with
`getaddrinfo EAI_AGAIN` even though `DATABASE_URL` is correct. Override the
resolvers with `DOCKER_DNS` and `DOCKER_DNS_FALLBACK` if your network blocks
public DNS.

See `ARCHITECTURE.md` §19 for the Dockerfile stages and environment details.
