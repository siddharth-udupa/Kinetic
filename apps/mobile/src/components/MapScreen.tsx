import { useEffect, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { DEFAULT_TILE_PROVIDER, type TileProviderId } from "@repo/maps"
import { getCurrentPositionIfPermitted } from "@/lib/locationTask"
import { useTheme } from "@/hooks/useTheme"
import MapView from "./map/Map"
import RoutePlannerSheet from "./map/RoutePlannerSheet"
import TileProviderPicker from "./map/TileProviderPicker"

export type MapScreenProps = {
  encodedPolyline?: string
}

export default function MapScreen({ encodedPolyline }: MapScreenProps) {
  const { colors } = useTheme()
  const [providerId, setProviderId] = useState<TileProviderId>(DEFAULT_TILE_PROVIDER)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false)
  // The loop the planner generated, drawn on the map underneath the sheet.
  const [plannedPolyline, setPlannedPolyline] = useState<string>()

  // Follow the athlete when permission is already granted. This deliberately
  // never prompts: the map stays on its default view if permission is missing.
  useEffect(() => {
    let cancelled = false

    getCurrentPositionIfPermitted().then((point) => {
      if (!cancelled && point) {
        setUserLocation({ latitude: point.latitude, longitude: point.longitude })
      }
    })

    return () => { cancelled = true }
  }, [])

  return (
    <View className="flex-1 bg-page relative">
      <MapView
        encodedPolyline={plannedPolyline ?? encodedPolyline}
        isStatic={false}
        providerId={providerId}
        userLocation={userLocation}
        style={{ width: "100%", height: "100%", flex: 1 }}
      />

      <TileProviderPicker
        currentProviderId={providerId}
        onSelectProvider={setProviderId}
      />

      <Pressable
        onPress={() => setIsRoutePlannerOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Plan a loop"
        className="absolute bottom-3 left-3 z-10 flex-row items-center gap-2 rounded-xl border border-line bg-surface/95 px-3.5 py-2.5 shadow-md active:opacity-80"
      >
        <Ionicons
          name="git-network-outline"
          size={16}
          color={colors.accentText}
        />
        <Text className="text-[12px] font-semibold text-ink">Plan a loop</Text>
      </Pressable>

      <RoutePlannerSheet
        visible={isRoutePlannerOpen}
        onClose={() => setIsRoutePlannerOpen(false)}
        onRouteChange={(route) => setPlannedPolyline(route?.polyline)}
      />
    </View>
  )
}
