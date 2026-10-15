/**
 * Cheap structural checks on the raw XML, run before the full parse so a bad file never
 * reaches the parser. Not a schema validator: a size cap, a <gpx> root, one <trkpt>,
 * and plausible lat/lon on the first point.
 */

const MAX_GPX_SIZE = 10_000_000 // 10 MB

export type GpxVerificationResult =
  | { ok: true }
  | { ok: false; reason: string }

export function verifyGpx(xmlString: string): GpxVerificationResult {
  if (xmlString.length > MAX_GPX_SIZE) {
    return {
      ok: false,
      reason: `File exceeds the maximum allowed size of ${MAX_GPX_SIZE / 1_000_000} MB`,
    }
  }

  const head = xmlString.slice(0, 1024)
  if (!head.includes("<gpx")) {
    return {
      ok: false,
      reason: "Missing <gpx> root element — this does not appear to be a GPX file",
    }
  }

  const trkptIndex = xmlString.indexOf("<trkpt")
  if (trkptIndex === -1) {
    return {
      ok: false,
      reason: "No <trkpt> elements found — the GPX file contains no track points",
    }
  }

  const window = xmlString.slice(trkptIndex, trkptIndex + 200)
  const latMatch = window.match(/lat\s*=\s*["']([^"']+)["']/)
  const lonMatch = window.match(/lon\s*=\s*["']([^"']+)["']/)

  if (!latMatch || !lonMatch) {
    return {
      ok: false,
      reason: "First <trkpt> is missing lat/lon attributes",
    }
  }

  const lat = parseFloat(latMatch[1]!)
  const lon = parseFloat(lonMatch[1]!)

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return {
      ok: false,
      reason: "First <trkpt> has non-numeric lat/lon values",
    }
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return {
      ok: false,
      reason: `First <trkpt> has out-of-range coordinates (lat: ${lat}, lon: ${lon})`,
    }
  }

  return { ok: true }
}
