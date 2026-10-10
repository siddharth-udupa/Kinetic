import { useState } from "react"
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, { FadeInDown } from "react-native-reanimated"
import { signIn, signUp } from "@/lib/auth-client"
import { hydratePreferences } from "@/lib/preferencesStore"
import {
  Banner,
  IconBadge,
  PrimaryButton,
  Segmented,
} from "@/components/ui/onboarding/primitives"
import { useTheme } from "@/components/ui/theme"
import {
  AuthField,
  FieldAction,
  OrDivider,
  SocialButton,
  TrustNote,
} from "@/components/ui/auth/primitives"

type Mode = "signin" | "signup"

const MIN_PASSWORD_LENGTH = 8

/**
 * One copy table for both tabs.
 *
 * The old screen swapped a single heading and left the rest of the page saying
 * "sign in" while the form asked for a name. Every user-visible string for a
 * mode now lives here, so a tab is a different screen rather than a different
 * first paragraph.
 */
const COPY: Record<Mode, { eyebrow: string; title: string; subtitle: string; google: string; divider: string; cta: string; trust: string }> = {
  signin: {
    eyebrow: "Welcome back",
    title: "Sign in to your account",
    subtitle: "Your activities, routes and segments are exactly where you left them.",
    google: "Continue with Google",
    divider: "or continue with email",
    cta: "Sign in",
    trust: "Your session stays on this device until you sign out.",
  },
  signup: {
    eyebrow: "Join the club",
    title: "Create your account",
    subtitle: "A couple of quick questions after this and you'll be logging activities.",
    google: "Sign up with Google",
    divider: "or sign up with email",
    cta: "Create account",
    trust: "We only use your email to sign you in. Nothing else.",
  },
}

export default function AuthScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()

  const [mode, setMode] = useState<Mode>("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Which request is in flight, so the two actions disable independently. */
  const [pending, setPending] = useState<"form" | "google" | null>(null)

  const copy = COPY[mode]
  const isSignup = mode === "signup"

  const isComplete =
    email.trim().length > 0 &&
    password.length >= MIN_PASSWORD_LENGTH &&
    (!isSignup || name.trim().length > 0)

  function changeMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    // Errors belong to the attempt that produced them; carrying one across the
    // tab switch told the user the email they just cleared was rejected.
    setError(null)
    setPending(null)
  }

  async function handleSubmit() {
    if (pending || !isComplete) return

    Keyboard.dismiss()
    setError(null)
    setPending("form")

    try {
      const result = isSignup
        ? await signUp.email({ name: name.trim(), email: email.trim(), password })
        : await signIn.email({ email: email.trim(), password })

      if (result.error) {
        setError(result.error.message ?? (isSignup ? "Could not create your account." : "Could not sign you in."))
        return
      }

      const userId = result.data?.user?.id

      // First sign in for this account: pull preferences once and keep them on
      // the device, so the onboarding gate never has to ask again.
      if (userId) {
        await hydratePreferences(userId)
      }

      // Route through the index gate rather than straight to the dashboard, so
      // a brand-new account still lands in onboarding.
      router.replace("/" as any)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setPending(null)
    }
  }

  async function handleGoogle() {
    if (pending) return

    setError(null)
    setPending("google")

    try {
      const { error: oauthError } = await signIn.social({ provider: "google", callbackURL: "/dashboard" })
      // No error means the browser is already handling the redirect, so the
      // button deliberately stays busy instead of flashing back to idle.
      if (oauthError) setError(oauthError.message ?? "Google sign-in failed.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.")
    } finally {
      setPending((current) => (current === "google" ? null : current))
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.page }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Body owns the scroll; the action is pinned so it never moves. */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: Math.max(insets.top, 12) + 8,
          paddingBottom: 8,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 480,
            alignSelf: "center",
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          {/*
            Keyed on the tab so the new mode replays the fade the web flow
            plays, instead of the previous heading being patched under a
            still-visible title.
          */}
          <Animated.View
            key={mode}
            entering={FadeInDown.duration(260)}
            style={{ alignItems: "center" }}
          >
            <IconBadge icon="flash-outline" size={56} />

            <Text
              className="text-xs font-semibold uppercase tracking-widest mt-6"
              style={{ color: colors.accentText }}
            >
              {copy.eyebrow}
            </Text>
            <Text
              className="text-[28px] leading-9 font-bold mt-2.5 text-center"
              style={{ color: colors.text }}
            >
              {copy.title}
            </Text>
            <Text
              className="text-[15px] leading-6 mt-3 text-center"
              style={{ color: colors.textSecondary }}
            >
              {copy.subtitle}
            </Text>
          </Animated.View>

          {/* Tabs — the muted-track segmented control, not two solid buttons. */}
          <View className="mt-7">
            <Segmented<Mode>
              options={[
                { label: "Sign in", value: "signin" },
                { label: "Sign up", value: "signup" },
              ]}
              value={mode}
              onChange={changeMode}
            />
          </View>

          <View className="mt-3">
            <SocialButton
              onPress={handleGoogle}
              busy={pending === "google"}
              disabled={pending !== null}
            >
              <Ionicons name="logo-google" size={20} />
              <Text className="text-[15px] font-semibold" style={{ color: colors.text }}>
                {copy.google}
              </Text>
            </SocialButton>
          </View>

          <OrDivider>{copy.divider}</OrDivider>

          <View className="gap-3.5">
            {isSignup ? (
              <AuthField
                label="Name"
                icon="person-outline"
                placeholder="Your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
              />
            ) : null}

            <AuthField
              label="Email"
              icon="mail-outline"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            <AuthField
              label="Password"
              icon="lock-closed-outline"
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete={isSignup ? "new-password" : "current-password"}
              textContentType={isSignup ? "newPassword" : "password"}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              trailing={
                <FieldAction
                  icon={showPassword ? "eye-off-outline" : "eye-outline"}
                  label={showPassword ? "Hide password" : "Show password"}
                  onPress={() => setShowPassword((value) => !value)}
                  selected={showPassword}
                />
              }
            />

            {/* Helper line — the reason the button is still disabled. */}
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-[13px]" style={{ color: colors.textMuted }}>
                {isSignup ? `Minimum ${MIN_PASSWORD_LENGTH} characters` : ""}
              </Text>
              {password.length > 0 && password.length < MIN_PASSWORD_LENGTH ? (
                <Text className="text-[13px]" style={{ color: colors.danger }}>
                  {MIN_PASSWORD_LENGTH - password.length} more
                </Text>
              ) : null}
            </View>

            {error ? (
              <Banner tone="danger" icon="alert-circle-outline">
                {error}
              </Banner>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Pinned action — same place on every mode, so it is never hunted for. */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: 4,
          backgroundColor: colors.page,
        }}
      >
        <View style={{ width: "100%", maxWidth: 480, alignSelf: "center" }}>
          <PrimaryButton
            label={copy.cta}
            icon="arrow-forward"
            disabled={!isComplete}
            loading={pending === "form"}
            onPress={handleSubmit}
          />

          <TrustNote>{copy.trust}</TrustNote>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}