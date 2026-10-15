import { XMLParser } from "fast-xml-parser"

export type RawTrackpoint = {
  lat: number,
  lng: number,
  ele: number | null,
  time: Date | null,
}

export function parserGPX(xmlString: string): RawTrackpoint[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name: string) => ["trkpt", "trk", "trkseg"].includes(name),
  })

  const result = parser.parse(xmlString)

  const tracks = result?.gpx?.trk ?? []
  const trackPoints: RawTrackpoint[] = []

  for (const trk of tracks) {
    const segments = trk?.trkseg ?? []
    for (const seg of segments) {
      const points = seg?.trkpt ?? []
      for (const pt of points) {
        trackPoints.push({
          lat: parseFloat(pt["@_lat"]),
          lng: parseFloat(pt["@_lon"]),
          ele: pt.ele ? parseFloat(pt.ele) : null,
          time: pt.time ? new Date(pt.time) : null,
        })
      }
    }
  }

  return trackPoints
}

// Parsed shape: gpx.trk[].trkseg[].trkpt[]
