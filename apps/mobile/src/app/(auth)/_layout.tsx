import { Stack } from "expo-router"

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // "auto": the screen paints its own surface and follows the scheme.
        statusBarStyle: "auto",
        animation: "fade",
      }}
    />
  )
}