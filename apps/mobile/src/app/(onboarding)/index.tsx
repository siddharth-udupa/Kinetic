import { useCallback, useEffect, useRef, useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession } from "@/lib/auth-client"
import { useOnboarding, DEFAULT_PREFS, type OnboardingPrefs } from "@/hooks/useOnboarding"
import { useThemeScheme } from "@/components/ThemeProvider"
import ProgressHeader from "@/components/ui/onboarding/ProgressHeader"
import WelcomeSlide from "@/components/ui/onboarding/WelcomeSlide"
import UsernameSlide from "@/components/ui/onboarding/UsernameSlide"
import UnitsSystemSlide from "@/components/ui/onboarding/UnitsSystemSlide"
import UnitsDetailSlide from "@/components/ui/onboarding/UnitsDetailSlide"
import AppearanceSlide from "@/components/ui/onboarding/AppearanceSlide"
import ReviewSlide from "@/components/ui/onboarding/ReviewSlide"

/** Slide order. The username slide sits at index 1 so index 0 is the welcome. */
const SLIDE = {
  welcome: 0,
  username: 1,
  unitsSystem: 2,
  unitsDetail: 3,
  appearance: 4,
  review: 5,
} as const

const TOTAL_SLIDES = 6

const SKIP_DISABLED_ON: readonly number[] = [SLIDE.welcome, SLIDE.username]

function clamp(index: number) {
  return Math.min(Math.max(index, 0), TOTAL_SLIDES - 1)
}

export default function OnboardingScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { data: session } = useSession()
  const { isLoading, updateUsername, completeOnboarding, skipOnboarding } = useOnboarding()

  const scrollRef = useRef<ScrollView>(null)
  const [currentSlide, setCurrentSlide] = useState<number>(SLIDE.welcome)
  const [username, setUsername] = useState("")
  const [hasUsername, setHasUsername] = useState(false)
  const [prefs, setPrefs] = useState<OnboardingPrefs>(DEFAULT_PREFS)
  const [isSavingUsername, setIsSavingUsername] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)

  // Picking a theme on the appearance slide repaints the running app. Leaving without
  // finishing drops the override, so the app follows the system again. ThemeProvider,
  // not Appearance: React Native Web has no setColorScheme, so a direct call is a no-op.
  const { setScheme } = useThemeScheme()
  const didCommit = useRef(false)

  const applyColorScheme = useCallback(
    (theme: OnboardingPrefs["theme"]) => setScheme(theme),
    [setScheme],
  )

  useEffect(
    () => () => {
      if (!didCommit.current) applyColorScheme("system")
    },
    [applyColorScheme],
  )

  // A plain function, not a useCallback: hoisting the generic into a callback
  // erases it, leaving `K` as the union of every pref.
  function updatePref<K extends keyof OnboardingPrefs>(key: K, value: OnboardingPrefs[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }))
  }

  const goTo = useCallback(
    (index: number) => {
      const next = clamp(index)
      scrollRef.current?.scrollTo({ x: next * width, animated: true })
      setCurrentSlide(next)
    },
    [width],
  )

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = clamp(Math.round(event.nativeEvent.contentOffset.x / width))
    setCurrentSlide((prev) => (prev === next ? prev : next))
  }

  async function handleSaveUsername(next: string): Promise<string | null> {
    setIsSavingUsername(true)
    const err = await updateUsername(next)
    setIsSavingUsername(false)
    if (!err) setHasUsername(true)
    return err
  }

  async function handleFinish() {
    // The review slide is reachable by swiping past an unfilled username.
    if (!hasUsername) {
      goTo(SLIDE.username)
      return
    }

    setFinishError(null)
    setIsFinishing(true)
    const err = await completeOnboarding(prefs)
    setIsFinishing(false)

    if (err) {
      setFinishError(err)
      return
    }

    didCommit.current = true
    applyColorScheme(prefs.theme)
    router.replace("/(app)/dashboard" as any)
  }

  async function handleSkip() {
    setIsFinishing(true)
    const err = await skipOnboarding()
    setIsFinishing(false)

    if (err) {
      setFinishError(err)
      goTo(SLIDE.review)
      return
    }

    didCommit.current = true
    applyColorScheme("system")
    router.replace("/(app)/dashboard" as any)
  }

  const canSkip = !SKIP_DISABLED_ON.includes(currentSlide)
  const userName = (session?.user.name ?? "").trim()

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        className="flex-1 bg-page"
        style={{ paddingTop: Math.max(insets.top, 12) }}
      >
        <View className="pb-5">
          <ProgressHeader
            step={currentSlide + 1}
            total={TOTAL_SLIDES}
            onSkip={canSkip ? handleSkip : undefined}
          />
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={handleMomentumEnd}
          style={{ flex: 1 }}
          contentContainerStyle={{ width: width * TOTAL_SLIDES }}
        >
          <View style={{ width }}>
            <WelcomeSlide name={userName} onNext={() => goTo(SLIDE.username)} />
          </View>

          <View style={{ width }}>
            <UsernameSlide
              username={username}
              onChange={setUsername}
              onSave={handleSaveUsername}
              onNext={() => goTo(SLIDE.unitsSystem)}
              isSaving={isSavingUsername || isLoading}
            />
          </View>

          <View style={{ width }}>
            <UnitsSystemSlide
              prefs={prefs}
              onChange={updatePref}
              onNext={() => goTo(SLIDE.unitsDetail)}
            />
          </View>

          <View style={{ width }}>
            <UnitsDetailSlide
              prefs={prefs}
              onChange={updatePref}
              onNext={() => goTo(SLIDE.appearance)}
            />
          </View>

          <View style={{ width }}>
            <AppearanceSlide
              prefs={prefs}
              onChange={(key, value) => {
                updatePref(key, value)
                // Repaint immediately so the choice is seen, not described.
                if (key === "theme") {
                  applyColorScheme(value as OnboardingPrefs["theme"])
                }
              }}
              onNext={() => goTo(SLIDE.review)}
            />
          </View>

          <View style={{ width }}>
            <ReviewSlide
              prefs={prefs}
              username={username}
              hasUsername={hasUsername}
              onEdit={goTo}
              onFinish={handleFinish}
              isSaving={isFinishing}
              error={finishError}
            />
          </View>
        </ScrollView>

        <View style={{ height: Math.max(insets.bottom, 20) }} />
      </View>
    </KeyboardAvoidingView>
  )
}
