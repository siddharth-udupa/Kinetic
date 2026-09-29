/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // "class" rather than "media" so `useColorScheme().setColorScheme()` can
  // override the OS appearance. Onboarding leans on that to preview a theme
  // live while it is still being chosen. With nothing overriding it, the
  // resolved scheme still falls back to the system one, so nothing else moves.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        strava: "#FC4C02",
      },
    },
  },
  plugins: [],
}