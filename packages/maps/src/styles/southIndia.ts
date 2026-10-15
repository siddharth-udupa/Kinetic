import type { VectorTileLayer } from "../types"

const SOURCE = "base-map"

const classOf = ["get", "class"]
const nameField = ["coalesce", ["get", "name:latin"], ["get", "name"]]
const rankKey = ["coalesce", ["get", "rank"], 100]

const inClass = (classes: string[]) => [
  "in",
  classOf,
  ["literal", classes],
]

const roadWidth = [
  "interpolate",
  ["linear"],
  ["zoom"],

  4,
  [
    "match",
    classOf,
    "motorway", 1.2,
    "motorway_link", 1.0,
    "trunk", 0.9,
    "trunk_link", 0.8,
    "primary", 0.7,
    "primary_link", 0.6,
    "secondary", 0.5,
    "secondary_link", 0.5,
    "tertiary", 0.4,
    0.25,
  ],

  7,
  [
    "match",
    classOf,
    "motorway", 2.5,
    "motorway_link", 2.0,
    "trunk", 2.1,
    "trunk_link", 1.8,
    "primary", 1.7,
    "primary_link", 1.5,
    "secondary", 1.3,
    "secondary_link", 1.2,
    "tertiary", 1.0,
    0.5,
  ],

  11,
  [
    "match",
    classOf,
    "motorway", 5,
    "motorway_link", 4,
    "trunk", 4.5,
    "trunk_link", 3.8,
    "primary", 3.6,
    "primary_link", 3.2,
    "secondary", 3.0,
    "secondary_link", 2.7,
    "tertiary", 2.4,
    "minor", 1.7,
    "service", 1.3,
    1,
  ],

  16,
  [
    "match",
    classOf,
    "motorway", 10,
    "motorway_link", 8,
    "trunk", 9,
    "trunk_link", 7,
    "primary", 7,
    "primary_link", 6,
    "secondary", 5.5,
    "secondary_link", 5,
    "tertiary", 4.5,
    "minor", 3.2,
    "service", 2.5,
    "path", 1.5,
    "track", 1.5,
    1,
  ],
]

const labelHalo = {
  "text-halo-color": "rgba(255,255,255,0.8)",
  "text-halo-width": 1.2,
  "text-halo-blur": 0.5,
}

export const southIndiaLayers: VectorTileLayer[] = [
  {
    id: "background",
    type: "background",
    source: SOURCE,
    paint: {
      "background-color": "hsl(47, 26%, 88%)",
    },
  },

  {
    id: "water",
    type: "fill",
    source: SOURCE,
    "source-layer": "water",
    paint: {
      "fill-color": "hsl(205, 56%, 73%)",
    },
  },

  {
    id: "waterway",
    type: "line",
    source: SOURCE,
    "source-layer": "waterway",
    paint: {
      "line-color": "hsl(205, 56%, 73%)",
      "line-opacity": 1,
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6, 0.8,
        10, 1.2,
        14, 3,
        20, 8,
      ],
    },
  },

  {
    id: "building",
    type: "fill",
    source: SOURCE,
    "source-layer": "building",
    minzoom: 13,
    paint: {
      "fill-antialias": true,
      "fill-color": "#ded3be",
      "fill-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        13, 0,
        15, 1,
      ],
      "fill-outline-color": "#d4b192",
    },
  },

  {
    id: "road-path",
    type: "line",
    source: SOURCE,
    "source-layer": "transportation",
    minzoom: 13,
    filter: inClass([
      "path",
      "track",
      "cycleway",
      "footway",
      "pedestrian",
    ]),
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#eeeeeb",
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        13, 0.7,
        16, 1.4,
        20, 3,
      ],
      "line-dasharray": [2, 2],
    },
  },

  {
    id: "road-minor",
    type: "line",
    source: SOURCE,
    "source-layer": "transportation",
    minzoom: 11,
    filter: inClass(["minor", "service"]),
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#f7f7f5",
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        11, 0.8,
        14, 1.8,
        18, 3,
      ],
    },
  },

  {
    id: "road-major",
    type: "line",
    source: SOURCE,
    "source-layer": "transportation",
    filter: inClass([
      "motorway",
      "motorway_link",
      "trunk",
      "trunk_link",
      "primary",
      "primary_link",
      "secondary",
      "secondary_link",
      "tertiary",
      "tertiary_link",
    ]),
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#ffffff",
      "line-width": roadWidth,
    },
  },

  {
    id: "road-major-casing",
    type: "line",
    source: SOURCE,
    "source-layer": "transportation",
    filter: inClass([
      "motorway",
      "motorway_link",
      "trunk",
      "trunk_link",
      "primary",
      "primary_link",
      "secondary",
      "secondary_link",
    ]),
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#d0cbc2",
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        4, 2,
        7, 3.2,
        11, 5,
        16, 7,
      ],
    },
  },

  {
    id: "road-labels",
    type: "symbol",
    source: SOURCE,
    "source-layer": "transportation_name",
    minzoom: 11,
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 350,
      "text-field": nameField,
      "text-font": ["Noto Sans Regular"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        11, 8,
        14, 10,
        18, 12,
      ],
      "text-max-width": 6,
      "text-padding": 4,
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "symbol-sort-key": rankKey,
    },
    paint: {
      "text-color": "#68645e",
      ...labelHalo,
    },
  },

  {
    id: "city-labels",
    type: "symbol",
    source: SOURCE,
    "source-layer": "place",
    filter: inClass(["city"]),
    minzoom: 4,
    layout: {
      "text-field": nameField,
      "text-font": ["Noto Sans Bold"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        4, 12,
        7, 14,
        10, 17,
        14, 20,
      ],
      "text-max-width": 10,
      "text-padding": 6,
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "symbol-sort-key": rankKey,
    },
    paint: {
      "text-color": "#272521",
      ...labelHalo,
    },
  },

  {
    id: "town-labels",
    type: "symbol",
    source: SOURCE,
    "source-layer": "place",
    filter: inClass(["town"]),
    minzoom: 7,
    layout: {
      "text-field": nameField,
      "text-font": ["Noto Sans Bold"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        7, 9,
        10, 11,
        14, 13,
      ],
      "text-max-width": 8,
      "text-padding": 5,
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "symbol-sort-key": rankKey,
    },
    paint: {
      "text-color": "#45423d",
      ...labelHalo,
    },
  },

  {
    id: "village-labels",
    type: "symbol",
    source: SOURCE,
    "source-layer": "place",
    filter: inClass(["village"]),
    minzoom: 11,
    layout: {
      "text-field": nameField,
      "text-font": ["Noto Sans Regular"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        11, 8,
        14, 10,
      ],
      "text-max-width": 7,
      "text-padding": 4,
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "symbol-sort-key": rankKey,
    },
    paint: {
      "text-color": "#66625c",
      ...labelHalo,
    },
  },

  {
    id: "poi-labels",
    type: "symbol",
    source: SOURCE,
    "source-layer": "poi",
    minzoom: 14,
    layout: {
      "text-field": nameField,
      "text-font": ["Noto Sans Regular"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        14, 8.5,
        16, 10.5,
      ],
      "text-anchor": "top",
      "text-offset": [0, 0.6],
      "text-max-width": 7,
      "text-padding": 3,
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "symbol-sort-key": rankKey,
    },
    paint: {
      "text-color": "#66625c",
      ...labelHalo,
    },
  },
]