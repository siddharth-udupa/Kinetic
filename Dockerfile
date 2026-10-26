# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base

# Native addons (better-sqlite3) may need to compile against musl.
RUN apk add --no-cache libc6-compat python3 make g++

RUN corepack enable && corepack prepare pnpm@12.14.0 --activate

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1 \
    EXPO_NO_TELEMETRY=1

WORKDIR /repo

# ─── Runtime base ─────────────────────────────────────────────────────────────
# Deliberately separate from `base`: the compiler toolchain is only needed to
# install/build and should not end up in the web or tile images.
FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

# ─── Dependencies ─────────────────────────────────────────────────────────────
# Copy every workspace manifest before installing. pnpm-workspace.yaml globs
# apps/* and packages/*, so a manifest missing here becomes an unresolved
# workspace dependency at build time.
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY apps/tile-provider/package.json ./apps/tile-provider/
COPY packages/db/package.json ./packages/db/
COPY packages/gpx/package.json ./packages/gpx/
COPY packages/maps/package.json ./packages/maps/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tiles/package.json ./packages/tiles/
COPY packages/types/package.json ./packages/types/
COPY packages/units/package.json ./packages/units/
COPY packages/validation/package.json ./packages/validation/

RUN pnpm install --frozen-lockfile

# ─── Source ───────────────────────────────────────────────────────────────────
FROM deps AS source

COPY . .

# ─── Web: build ───────────────────────────────────────────────────────────────
FROM source AS web-build

# DATABASE_URL is only needed because the DB module is imported while Next
# collects page data. It is not baked into the client bundle; the runtime value
# comes from the environment in the final stage.
ARG DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/kinetic
# NEXT_PUBLIC_* is inlined into the client bundle, so it has to be a build arg.
ARG NEXT_PUBLIC_TILE_SERVER_URL=http://localhost:4000

ENV DATABASE_URL=$DATABASE_URL \
    NEXT_PUBLIC_TILE_SERVER_URL=$NEXT_PUBLIC_TILE_SERVER_URL

RUN pnpm --filter web build

# ─── Web: production runtime ──────────────────────────────────────────────────
FROM runtime AS web

ENV PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=web-build /repo/apps/web/.next/standalone ./
COPY --from=web-build /repo/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

CMD ["node", "apps/web/server.js"]

# ─── Tile provider ────────────────────────────────────────────────────────────
# packages/* ship raw TypeScript, so the tile server runs from source through
# tsx. `pnpm deploy` copies the workspace packages and their production
# dependencies into a self-contained tree instead of shipping the monorepo.
FROM source AS tiles-build

RUN pnpm --filter tile-provider deploy --prod --legacy /out

FROM runtime AS tiles

# tsx is a devDependency (the runtime command is `tsx src/index.ts`), so the
# prod deploy omits it. Install it globally rather than adding it to the app's
# production dependency list just for the container.
RUN npm install --global tsx@4.23.15

COPY --from=tiles-build /out ./

RUN mkdir -p /app/data

ENV PORT=4000 \
    HOST=0.0.0.0 \
    TILES_DB_PATH=/app/data/south-india.mbtiles

EXPOSE 4000

CMD ["tsx", "src/index.ts"]

# ─── Mobile: Expo/Metro dev server ────────────────────────────────────────────
# The native app is built by EAS, not by this image. This target exists so the
# Expo bundler (and its web preview) can run alongside web + tiles locally.
# Deploying only the mobile workspace keeps the image out of the 5 GB range the
# full monorepo install would produce.
FROM source AS mobile-build

RUN pnpm --filter mobile deploy --legacy /out

FROM runtime AS mobile

ENV NODE_ENV=development \
    BROWSER=none

WORKDIR /app

COPY --from=mobile-build /out ./

# metro.config.js reads ../../packages/shared/theme.css (relative to /app).
COPY --from=source /repo/packages/shared/theme.css /packages/shared/theme.css

EXPOSE 8081

CMD ["./node_modules/.bin/expo", "start", "--web", "--port", "8081"]
