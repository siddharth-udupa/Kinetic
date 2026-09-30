import { Stack } from "expo-router"

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // "auto" rather than a fixed style: the screen paints its own surface
        // and follows the colour scheme, so the bar has to follow it too.
        statusBarStyle: "auto",
        animation: "fade",
      }}
    />
  )
}