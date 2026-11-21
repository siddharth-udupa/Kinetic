import { useCallback, useMemo, useRef, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { LoopResponse, LoopRoute } from "@repo/validation"
import { DEFAULT_TILE_PROVIDER, type TileProviderId } from "@repo/maps"
import { useTheme } from "@/hooks/useTheme"
import { isApproximateFix, useUserLocation } from "@/hooks/useUserLocation"
import MapView from "./map/Map"
import RouteOptions from "./map/RouteOptions"
import RoutePlannerSheet from "./map/RoutePlannerSheet"
import TileProviderPicker from "./map/TileProviderPicker"

export type MapScreenProps = {
  encodedPolyline?: string
}

export default function MapScreen({ encodedPolyline }: MapScreenProps) {
  const { colors } = useTheme()
  const [providerId, setProviderId] = useState<TileProviderId>(DEFAULT_TILE_PROVIDER)
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false)
  const [routeOptions, setRouteOptions] = useState<LoopRoute[]>([])
  /* The best route in the response is highlighted until the visitor picks
     another card. Rank is unique within a response, so it doubles as the id. */
  const [activeRouteId, setActiveRouteId] = useState<string>()
  const [isPicking, setIsPicking] = useState(false)
  /* Whether a pick started from the planner, and should hand control back to it
     once the visitor has tapped (or cancelled). */
  const returnToPlannerRef = useRef(false)

  // The maps tab asks for a precise fix on open. A refusal simply leaves the
  // provider view and the layer controls as they were; the planner below asks
  // again before it will build a loop.
  const { location, status, request, isManual, setManualLocation } =
    useUserLocation({ requestOnMount: true })

  /* A city-level guess is not a start point: it is usually a network lookup
     rather than a GPS fix, and it can be hundreds of kilometres out. */
  const isApproximate = !isManual && isApproximateFix(location)

  /* A successful request replaces the whole set; a failure or a request in
     flight clears it, so no cards survive an error. */
  const handleRouteChange = useCallback((response: LoopResponse | null) => {
    if (!response || response.routes.length === 0) {
      setRouteOptions([])
      setActiveRouteId(undefined)
      return
    }

    setRouteOptions(response.routes)
    setActiveRouteId(String(response.routes[0].rank))
  }, [])

  const mapRoutes = useMemo(
    () =>
      routeOptions.map((route) => ({
        id: String(route.rank),
        polyline: route.polyline,
      })),
    [routeOptions],
  )

  const startPicking = useCallback((returnToPlanner: boolean) => {
    returnToPlannerRef.current = returnToPlanner
    setIsPicking(true)
    // The sheet covers the map, so it steps aside to pick.
    setIsRoutePlannerOpen(false)
  }, [])

  const stopPicking = useCallback(() => {
    setIsPicking(false)
    if (!returnToPlannerRef.current) return
    returnToPlannerRef.current = false
    setIsRoutePlannerOpen(true)
  }, [])

  const handlePickLocation = useCallback(
    (fix: { lat: number; lng: number }) => {
      setManualLocation(fix)
      stopPicking()
    },
    [setManualLocation, stopPicking],
  )

  return (
    <View className="flex-1 bg-page relative">
      <MapView
        routes={mapRoutes}
        activeRouteId={activeRouteId}
        encodedPolyline={encodedPolyline}
        isStatic={false}
        providerId={providerId}
        userLocation={location}
        isPicking={isPicking}
        onPickLocation={handlePickLocation}
        style={{ width: "100%", height: "100%", flex: 1 }}
      />

      <TileProviderPicker
        currentProviderId={providerId}
        onSelectProvider={setProviderId}
      />

      {/* One strip for the three things the map needs to say about the start
          point: pick a new one, explain an approximate fix, or show that a
          chosen point is in force. */}
      {isPicking ? (
        <View
          accessibilityRole="alert"
          className="absolute top-16 left-3 right-3 z-20 flex-row items-center gap-2.5 rounded-xl border border-accent/30 bg-surface px-3 py-2.5 shadow-md"
        >
          <Ionicons
            name="locate"
            size={15}
            color={colors.accentText}
          />
          <Text className="min-w-0 flex-1 text-[12px] font-medium leading-4 text-ink">
            Tap the map where the loop should start.
          </Text>
          <Pressable
            onPress={stopPicking}
            accessibilityRole="button"
            accessibilityLabel="Cancel choosing a start point"
            className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 active:opacity-80"
          >
            <Text className="text-[11px] font-semibold text-ink-secondary">
              Cancel
            </Text>
          </Pressable>
        </View>
      ) : isApproximate ? (
        <View
          accessibilityRole="alert"
          className="absolute top-16 left-3 right-3 z-20 flex-row items-center gap-2.5 rounded-xl border border-warning/30 bg-surface px-3 py-2.5 shadow-md"
        >
          <Ionicons
            name="warning-outline"
            size={15}
            color={colors.warning}
          />
          <Text className="min-w-0 flex-1 text-[11px] leading-4 text-ink-secondary">
            The device only knows an approximate location
            {location?.accuracy
              ? ` (±${Math.max(1, Math.round(location.accuracy / 1_000))} km)`
              : ""}
            . Set your start point on the map.
          </Text>
          <Pressable
            onPress={() => startPicking(false)}
            accessibilityRole="button"
            accessibilityLabel="Set the start point on the map"
            className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 active:opacity-80"
          >
            <Text className="text-[11px] font-semibold text-accent-text">
              Set on map
            </Text>
          </Pressable>
        </View>
      ) : isManual ? (
        <View
          accessibilityRole="alert"
          className="absolute top-16 left-3 right-3 z-20 flex-row items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 shadow-md"
        >
          <Ionicons
            name="location"
            size={14}
            color={colors.accentText}
          />
          <Text className="min-w-0 flex-1 text-[11px] leading-4 text-ink-secondary">
            Start point set on the map.
          </Text>
          <Pressable
            onPress={() => setManualLocation(null)}
            accessibilityRole="button"
            accessibilityLabel="Use the device location instead"
            className="shrink-0 active:opacity-80"
          >
            <Text className="text-[11px] font-semibold text-accent-text">
              Use device location
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* The route cards stack above the map controls, with a gap between
          them, so both stay reachable. The controls hide while the planner is
          open or the map is armed for a pick; the sheet or the pick banner
          would otherwise sit on top. */}
      <View className="absolute bottom-3 left-0 right-0 z-20 gap-3">
        <RouteOptions
          routes={routeOptions}
          activeRouteId={activeRouteId}
          onSelect={(route) => setActiveRouteId(String(route.rank))}
        />

        {isPicking ? null : (
          <View className="flex-row items-center gap-2 px-3">
            {isRoutePlannerOpen ? null : (
              <Pressable
                onPress={() => setIsRoutePlannerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Plan a loop"
                className="flex-row items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-md active:opacity-80"
              >
                <Ionicons
                  name="git-network-outline"
                  size={16}
                  color={colors.accentText}
                />
                <Text className="text-[12px] font-semibold text-ink">
                  Plan a loop
                </Text>
              </Pressable>
            )}

            {/* Always reachable: a device fix can be confidently wrong, and
                the visitor needs a way to correct it without opening the
                planner. */}
            <Pressable
              onPress={() => startPicking(false)}
              accessibilityRole="button"
              accessibilityLabel="Set your start location on the map"
              className="size-10 items-center justify-center rounded-xl border border-line bg-surface shadow-md active:opacity-80"
            >
              <Ionicons
                name="locate-outline"
                size={17}
                color={colors.inkSecondary}
              />
            </Pressable>
          </View>
        )}
      </View>

      <RoutePlannerSheet
        visible={isRoutePlannerOpen}
        onClose={() => setIsRoutePlannerOpen(false)}
        userLocation={location}
        locationStatus={status}
        isManualLocation={isManual}
        isApproximateLocation={isApproximate}
        onRequestLocation={request}
        onPickLocation={() => startPicking(true)}
        onClearManualLocation={() => setManualLocation(null)}
        onRouteChange={handleRouteChange}
      />
    </View>
  )
}
