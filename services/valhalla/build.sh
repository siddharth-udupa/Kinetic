#!/usr/bin/env bash
#
# One-off Valhalla graph build.
#
# Builds south-india.osm.pbf into custom_files/valhalla_tiles.tar with admin,
# timezone and 30 m elevation data, then exits. The compose service only ever
# serves the result, so this never runs as part of `docker compose up`.
#
# Usage:
#   ./services/valhalla/build.sh            # no-op if the tar already exists
#   ./services/valhalla/build.sh --force    # rebuild the graph
#   VALHALLA_THREADS=3 ./services/valhalla/build.sh
#
set -euo pipefail

here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd -- "$here/../.." && pwd)"
files="$here/custom_files"
pbf_src="$root/apps/tile-provider/data/south-india.osm.pbf"
pbf_dst="$files/south-india.osm.pbf"
tar="$files/valhalla_tiles.tar"
image="${VALHALLA_IMAGE:-ghcr.io/valhalla/valhalla-scripted:latest}"
# valhalla_build_tiles is the process that gets OOM-killed first. This box has
# 7 GB total, so 2 is the safe default; raise it if the build survives.
threads="${VALHALLA_THREADS:-2}"
force=0

for arg in "$@"; do
  case "$arg" in
    --force) force=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

command -v docker >/dev/null 2>&1 || { echo "docker is required" >&2; exit 1; }
[ -f "$pbf_src" ] || { echo "Missing OSM extract: $pbf_src" >&2; exit 1; }

mkdir -p "$files"

# The image expects its PBFs inside the mounted volume. Copy once so the volume
# is self-contained; a hard link would silently follow later in-place updates.
if [ ! -f "$pbf_dst" ]; then
  echo "Copying $(basename "$pbf_src") into custom_files/ (~461 MB, one-off)"
  cp "$pbf_src" "$pbf_dst"
fi

if [ -f "$tar" ] && [ "$force" -eq 0 ]; then
  echo "Graph already built: $tar"
  echo "Pass --force to rebuild it."
  exit 0
fi

if [ "$force" -eq 1 ]; then
  echo "Forcing a rebuild (elevation tiles are reused)."
fi

echo "Image:   $image"
echo "Threads: $threads"
echo "Disk:    $(du -sh "$files" | cut -f1) in custom_files/ so far"
echo "First build downloads ~1 GB of elevation tiles and can take 15-30 min."
echo

docker run --rm \
  -v "$files:/custom_files" \
  -e force_rebuild=$([ "$force" -eq 1 ] && echo True || echo False) \
  -e build_elevation=True \
  -e build_admins=True \
  -e build_time_zones=True \
  -e build_tar=True \
  -e serve_tiles=False \
  -e server_threads="$threads" \
  "$image" 2>&1 | tee "$files/build.log"

# The scripted image runs as root and writes root-owned files. Hand them back
# so the checkout stays editable and deletable without sudo.
docker run --rm \
  -v "$files:/custom_files" \
  --entrypoint chown \
  "$image" -R "$(id -u):$(id -g)" /custom_files

echo
echo "Built: $tar"
ls -lh "$tar"
