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
        /*
         * The brand accent, for the surfaces that predate the onboarding theme
         * (activity cards). Same value as the theme's `accent`; anything that
         * can reach `useOnboardingTheme()` should prefer that instead, since it
         * also resolves the dark-mode variant.
         */
        brand: "#FC4C02",
      },
    },
  },
  plugins: [],
}