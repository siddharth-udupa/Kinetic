import { useState } from "react"
import { View } from "react-native"
import { type EdgeInsets } from "react-native-safe-area-context"
import { DEFAULT_TILE_PROVIDER, type TileProviderId } from "@repo/maps"
import MapView from "./map/Map"
import TileProviderPicker from "./map/TileProviderPicker"

export type MapScreenProps = {
  insets?: EdgeInsets
  encodedPolyline?: string
}

export default function MapScreen({ insets, encodedPolyline }: MapScreenProps) {
  const [providerId, setProviderId] = useState<TileProviderId>(DEFAULT_TILE_PROVIDER)

  const paddingBottom = insets ? Math.max(insets.bottom, 25) + 55 : 80

  return (
    <View className="flex-1 bg-page relative" style={{ paddingBottom }}>
      {/* Pure Map Renderer */}
      <MapView
        encodedPolyline={encodedPolyline}
        isStatic={false}
        providerId={providerId}
        style={{ width: "100%", height: "100%", flex: 1 }}
      />

      {/* Changeable Tile Provider UI Module */}
      <TileProviderPicker
        currentProviderId={providerId}
        onSelectProvider={setProviderId}
      />
    </View>
  )
}
