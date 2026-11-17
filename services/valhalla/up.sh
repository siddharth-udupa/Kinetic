#!/usr/bin/env bash
#
# Start the Valhalla routing service and wait until it is healthy.
#
# Used by `pnpm dev` and `pnpm valhalla:up`. The graph is built separately by
# ./services/valhalla/build.sh, so this only starts the container and fails
# loudly if the graph is missing or Docker is unavailable.
#
# Usage:
#   ./services/valhalla/up.sh
#
set -euo pipefail

here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd -- "$here/../.." && pwd)"
tar="$here/custom_files/valhalla_tiles.tar"

command -v docker >/dev/null 2>&1 || {
  echo "docker is required to run Valhalla." >&2
  exit 1
}

docker info >/dev/null 2>&1 || {
  echo "The Docker daemon is not running. Start Docker, then retry." >&2
  exit 1
}

if [ ! -f "$tar" ]; then
  echo "Valhalla graph not built: $tar is missing." >&2
  echo "Build it once (~15-30 min), then retry:" >&2
  echo "  ./services/valhalla/build.sh" >&2
  exit 1
fi

exec docker compose -f "$root/compose.yaml" --profile routing \
  up -d --wait --wait-timeout "${VALHALLA_WAIT_TIMEOUT:-240}" valhalla
