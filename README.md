Run

```
  pnpm --filter web dev
```

from the root to run the website.

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
