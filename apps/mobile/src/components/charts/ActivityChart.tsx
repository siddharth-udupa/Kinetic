import { useMemo } from "react"
import { Text, TextInput, View } from "react-native"
import Animated, {
  useAnimatedProps,
  useDerivedValue,
} from "react-native-reanimated"
import type { SharedValue } from "react-native-reanimated"
import {
  CartesianChart,
  Area,
  Line,
  useChartPressState,
} from "victory-native"
import { Circle, Line as SkiaLine, Group } from "@shopify/react-native-skia"

import type {
  DistanceUnit,
  ElevationUnit,
  SpeedUnit,
} from "@repo/units"
import { buildChartData } from "./chartMath"

export { buildChartData } from "./chartMath"
export type { ChartPoint } from "./chartMath"

// AnimatedTextInput lets us update displayed text entirely on the UI thread
// via useAnimatedProps — no React re-renders, no JS-thread setState calls.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

// ── Theme ─────────────────────────────────────────────────────────────────────
// Accent line, soft fill, hairline grids tuned for small mobile screens.
const CHART = {
  line: "#FC5200",
  fill: "#FC5200",
  fillOpacity: 0.16,
  grid: "rgba(148, 163, 184, 0.16)",
  frame: "rgba(148, 163, 184, 0.35)",
  label: "#94a3b8",
  crosshair: "#64748b",
  hint: "Touch and drag on the chart",
} as const

export type ActivityChartsClientProps = {
  distanceData: number[]
  altitudeData: number[]
  speedData: number[]
  distanceUnit: DistanceUnit
  elevationUnit: ElevationUnit
  speedUnit: SpeedUnit
}

export default function ActivityChart({
  distanceData,
  altitudeData,
  speedData,
  distanceUnit,
  elevationUnit,
  speedUnit,
}: ActivityChartsClientProps) {
  // ── Hooks first, unconditionally — early returns come after. ──
  const data = useMemo(
    () =>
      buildChartData(
        distanceData,
        altitudeData,
        speedData,
        distanceUnit,
        elevationUnit,
        speedUnit
      ),
    [distanceData, altitudeData, speedData, distanceUnit, elevationUnit, speedUnit]
  )

  const { state } = useChartPressState({ x: 0, y: { altitude: 0 } })

  const distSuffix = distanceUnit === "imperial" ? "mi" : "km"
  const elevSuffix = elevationUnit === "feet" ? "ft" : "m"

  // Nearest-point lookup runs on the UI thread. `data` holds plain numbers
  // only, so capturing it in the worklet is safe; it refreshes on every
  // render where the memoised array changes.
  const distText = useDerivedValue(() => {
    "worklet"
    if (!state.isActive.value || data.length === 0) return "-"
    const target = state.x.value.value
    if (typeof target !== "number" || !Number.isFinite(target)) return "-"
    let best = 0
    let bestDelta = Math.abs((data[0]?.distance ?? 0) - target)
    for (let i = 1; i < data.length; i++) {
      const delta = Math.abs((data[i]?.distance ?? 0) - target)
      if (delta < bestDelta) {
        bestDelta = delta
        best = i
      }
    }
    return `${(data[best]?.distance ?? 0).toFixed(2)} ${distSuffix}`
  })

  const elevText = useDerivedValue(() => {
    "worklet"
    if (!state.isActive.value || data.length === 0) return "-"
    const target = state.x.value.value
    if (typeof target !== "number" || !Number.isFinite(target)) return "-"
    let best = 0
    let bestDelta = Math.abs((data[0]?.distance ?? 0) - target)
    for (let i = 1; i < data.length; i++) {
      const delta = Math.abs((data[i]?.distance ?? 0) - target)
      if (delta < bestDelta) {
        bestDelta = delta
        best = i
      }
    }
    return `${Math.round(data[best]?.altitude ?? 0)} ${elevSuffix}`
  })

  const gradeText = useDerivedValue(() => {
    "worklet"
    if (!state.isActive.value || data.length === 0) return "-"
    const target = state.x.value.value
    if (typeof target !== "number" || !Number.isFinite(target)) return "-"
    let best = 0
    let bestDelta = Math.abs((data[0]?.distance ?? 0) - target)
    for (let i = 1; i < data.length; i++) {
      const delta = Math.abs((data[i]?.distance ?? 0) - target)
      if (delta < bestDelta) {
        bestDelta = delta
        best = i
      }
    }
    const g = data[best]?.grade ?? 0
    if (typeof g !== "number" || !Number.isFinite(g)) return "—"
    const sign = g > 0.05 ? "+" : g < -0.05 ? "−" : ""
    return `${sign}${Math.abs(g).toFixed(1)}%`
  })

  const distProps = useAnimatedProps(() => ({ text: distText.value }))
  const elevProps = useAnimatedProps(() => ({ text: elevText.value }))
  const gradeProps = useAnimatedProps(() => ({ text: gradeText.value }))

  // Safe to bail now — every hook above has already run.
  if (data.length === 0) return null

  return (
    <View className="my-4 w-full">
      {/* Readout card — values update on the UI thread, zero React re-renders */}
      <View className="flex-row items-stretch rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
        <Stat label="DIST" animatedProps={distProps} flex />
        <Divider />
        <Stat label="ELEV" animatedProps={elevProps} flex />
        <Divider />
        <Stat label="GRADE" animatedProps={gradeProps} accent />
      </View>
      <Text className="px-1 pb-1 pt-1.5 text-[11px] italic text-gray-400 dark:text-slate-500">
        {CHART.hint}
      </Text>

      {/* Explicit numeric height so Victory's onLayout fires reliably on
          mobile — className alone won't propagate layout size into the Skia
          canvas and the chart would render nothing. */}
      <View className="w-full" style={{ height: 220 }}>
        <CartesianChart
          data={data}
          xKey="distance"
          yKeys={["altitude"]}
          chartPressState={state}
          padding={{ left: 8, right: 12, top: 12, bottom: 8 }}
          domainPadding={{ left: 4, right: 4, top: 18, bottom: 8 }}
          axisOptions={{
            tickCount: { x: 4, y: 4 },
            labelColor: CHART.label,
            lineColor: {
              grid: { x: CHART.grid, y: CHART.grid },
              frame: CHART.frame,
            },
            lineWidth: { grid: { x: 1, y: 1 }, frame: 1 },
            labelOffset: { x: 6, y: 6 },
            formatXLabel: (v) => {
              const num = typeof v === "number" ? v : Number(v)
              if (!Number.isFinite(num)) return ""
              return num >= 100 ? `${Math.round(num)}` : `${num.toFixed(1)}`
            },
            formatYLabel: (v) => {
              const num = typeof v === "number" ? v : Number(v)
              if (!Number.isFinite(num)) return ""
              return `${Math.round(num)}`
            },
          }}
        >
          {({ points, chartBounds }) => (
            <>
              <Area
                points={points.altitude}
                y0={chartBounds.bottom}
                color={CHART.fill}
                opacity={CHART.fillOpacity}
                curveType="monotoneX"
                connectMissingData={false}
                animate={{ type: "timing", duration: 300 }}
              />
              <Line
                points={points.altitude}
                color={CHART.line}
                strokeWidth={2}
                curveType="monotoneX"
                connectMissingData={false}
                animate={{ type: "timing", duration: 300 }}
              />
              {/* Always mounted — visibility is driven by animated opacity so
                  we never treat a SharedValue as a React boolean. */}
              <ToolTip
                x={state.x.position}
                y={state.y.altitude.position}
                bottom={chartBounds.bottom}
                isActive={state.isActive}
              />
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  )
}

// ── Readout stat cell ─────────────────────────────────────────────────────────
function Stat({
  label,
  animatedProps,
  flex,
  accent,
}: {
  label: string
  animatedProps: object
  flex?: boolean
  accent?: boolean
}) {
  return (
    <View className={flex ? "flex-1 items-center" : "items-center px-1"}>
      <Text className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-slate-500">
        {label}
      </Text>
      <AnimatedTextInput
        animatedProps={animatedProps}
        editable={false}
        underlineColorAndroid="transparent"
        selectTextOnFocus={false}
        defaultValue="-"
        className={`mt-0.5 p-0 text-[13px] font-bold tabular-nums ${accent
          ? "text-[#FC5200]"
          : "text-gray-900 dark:text-slate-100"
          }`}
      />
    </View>
  )
}

function Divider() {
  return <View className="mx-2 w-px self-stretch bg-gray-200 dark:bg-slate-800" />
}

// ── ToolTip ───────────────────────────────────────────────────────────────────
// Receives Victory's SharedValue positions directly; show/hide runs entirely
// on the UI thread via a derived opacity.
type ToolTipProps = {
  x: SharedValue<number>
  y: SharedValue<number>
  bottom: number
  isActive: SharedValue<boolean>
}

function ToolTip({ x, y, bottom, isActive }: ToolTipProps) {
  const opacity = useDerivedValue(() => {
    "worklet"
    return isActive.value ? 1 : 0
  })

  // Skia Line needs animated SkPoint objects, not raw SharedValue numbers.
  const p1 = useDerivedValue(() => {
    "worklet"
    const px = Number.isFinite(x.value) ? x.value : 0
    return { x: px, y: 0 }
  })
  const p2 = useDerivedValue(() => {
    "worklet"
    const px = Number.isFinite(x.value) ? x.value : 0
    const base = Number.isFinite(bottom) ? bottom : 0
    return { x: px, y: base }
  })

  return (
    <Group opacity={opacity}>
      <SkiaLine p1={p1} p2={p2} color={CHART.crosshair} strokeWidth={1} opacity={0.6} />
      <Circle cx={x} cy={y} r={7} color="white" opacity={0.95} />
      <Circle cx={x} cy={y} r={4.5} color={CHART.line} />
    </Group>
  )
}
