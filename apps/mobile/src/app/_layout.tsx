import "../../global.css"
import { useEffect } from "react"
import { cleanupStaleLocationTasks } from "../lib/locationTask"
import { ThemeProvider } from "../components/ThemeProvider"
import { Slot } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"

export default function RootLayout() {
  useEffect(() => {
    cleanupStaleLocationTasks().catch((err) => {
      console.warn("[RootLayout] Stale task cleanup warning:", err)
    })
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Slot />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}