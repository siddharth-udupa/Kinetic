import { useEffect, useState } from "react"
import { View } from "react-native"
import { DEFAULT_TILE_PROVIDER, type TileProviderId } from "@repo/maps"
import { getCurrentPositionIfPermitted } from "@/lib/locationTask"
import MapView from "./map/Map"
import TileProviderPicker from "./map/TileProviderPicker"

export type MapScreenProps = {
  encodedPolyline?: string
}

export default function MapScreen({ encodedPolyline }: MapScreenProps) {
  const [providerId, setProviderId] = useState<TileProviderId>(DEFAULT_TILE_PROVIDER)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)

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
        encodedPolyline={encodedPolyline}
        isStatic={false}
        providerId={providerId}
        userLocation={userLocation}
        style={{ width: "100%", height: "100%", flex: 1 }}
      />

      <TileProviderPicker
        currentProviderId={providerId}
        onSelectProvider={setProviderId}
      />
    </View>
  )
}
