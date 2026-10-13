import { useState } from "react"
import { Keyboard, Text, TextInput, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  Banner,
  PrimaryButton,
  SlideHeading,
  SlideShell,
} from "./primitives"
import { useTheme } from "@/hooks/useTheme"

type Props = {
  username: string
  onChange: (value: string) => void
  onSave: (username: string) => Promise<string | null>
  onNext: () => void
  isSaving: boolean
}

const MIN_LENGTH = 3
const MAX_LENGTH = 20

function getValidationMessage(value: string): string | null {
  if (value.length === 0) return null
  if (value.length < MIN_LENGTH) {
    return `At least ${MIN_LENGTH} characters.`
  }
  if (value.length > MAX_LENGTH) {
    return `Maximum ${MAX_LENGTH} characters.`
  }
  if (!/^[a-z0-9_]+$/.test(value)) {
    return "Letters, numbers and underscores only."
  }
  return null
}

export default function UsernameSlide({
  username,
  onChange,
  onSave,
  onNext,
  isSaving,
}: Props) {
  const { colors } = useTheme()
  const [apiError, setApiError] = useState<string | null>(null)

  const normalized = username.toLowerCase().replace(/\s/g, "")
  const validationMsg = getValidationMessage(normalized)
  const isValid = normalized.length >= MIN_LENGTH && !validationMsg

  async function handleContinue() {
    if (!isValid) return
    Keyboard.dismiss()
    setApiError(null)
    const err = await onSave(normalized)
    if (err) {
      setApiError(err)
    } else {
      onNext()
    }
  }

  function handleChange(next: string) {
    setApiError(null)
    onChange(next.toLowerCase().replace(/\s/g, ""))
  }

  const message = apiError ?? validationMsg
  const hasText = normalized.length > 0

  return (
    <SlideShell
      footer={
        <PrimaryButton
          label="Continue"
          disabled={!isValid}
          loading={isSaving}
          icon="arrow-forward"
          onPress={handleContinue}
        />
      }
    >
      <SlideHeading
        icon="person-outline"
        title="Pick a username"
        subtitle="This is how other runners will find you. You can change it any time."
      />

      {/*
        Live preview of the finished profile.

        Deliberately built to not look like the field below it: flat muted
        surface with no border, a leading avatar instead of an `@` prefix, and
        a caption. An earlier version was a bordered box with a leading glyph,
        which users read as a second input and tried to tap.
      */}
      <View
        className="rounded-2xl px-4 py-3.5 mb-6"
        style={{ backgroundColor: colors.cardMuted }}
      >
        <Text
          className="text-[11px] font-semibold uppercase tracking-widest mb-2.5"
          style={{ color: colors.textMuted }}
        >
          How you'll appear
        </Text>

        <View className="flex-row items-center gap-3">
          <View
            className="h-10 w-10 rounded-full items-center justify-center"
            style={{ backgroundColor: isValid ? colors.accent : colors.border }}
          >
            <Text
              className="text-[16px] font-bold"
              style={{ color: isValid ? colors.onAccent : colors.textMuted }}
            >
              {(normalized[0] ?? "?").toUpperCase()}
            </Text>
          </View>

          <View className="flex-1">
            <Text
              className="text-[16px] font-semibold"
              numberOfLines={1}
              style={{ color: hasText ? colors.text : colors.textSecondary }}
            >
              {hasText ? `@${normalized}` : "@your_username"}
            </Text>
            <Text className="text-[12px] mt-0.5" style={{ color: colors.textSecondary }}>
              {isValid ? "Ready to save" : "Your public profile name"}
            </Text>
          </View>
        </View>
      </View>

      {/* Input */}
      <View
        className="flex-row items-center rounded-xl border px-4 h-14"
        style={{
          borderColor: message
            ? colors.danger
            : isValid
              ? colors.accent
              : colors.border,
          backgroundColor: colors.card,
        }}
      >
        <Text className="text-[16px] font-medium mr-1" style={{ color: colors.textMuted }}>
          @
        </Text>
        <TextInput
          className="flex-1 text-[16px] font-medium"
          placeholder="your_username"
          placeholderTextColor={colors.textMuted}
          value={normalized}
          onChangeText={handleChange}
          onSubmitEditing={handleContinue}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          maxLength={MAX_LENGTH}
          returnKeyType="next"
          style={{ color: colors.text }}
        />
        {isValid ? (
          <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
        ) : null}
      </View>

      {/* Helper line — count, or the reason the button is still disabled. */}
      <View className="flex-row items-center justify-between mt-2.5 px-1">
        {message ? (
          <Text className="text-[13px] flex-1" style={{ color: colors.danger }}>
            {message}
          </Text>
        ) : (
          <Text className="text-[13px] flex-1" style={{ color: colors.textMuted }}>
            {MIN_LENGTH}–{MAX_LENGTH} characters
          </Text>
        )}
        <Text className="text-[13px]" style={{ color: colors.textMuted }}>
          {normalized.length}/{MAX_LENGTH}
        </Text>
      </View>

      {apiError ? (
        <View className="mt-5">
          <Banner tone="danger" icon="alert-circle-outline">
            {apiError} — try another name.
          </Banner>
        </View>
      ) : null}

      {/* Reassurance in place of the skip control, which is hidden here. */}
      <View className="flex-row items-center gap-2 mt-7">
        <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />
        <Text className="text-[12px] flex-1" style={{ color: colors.textMuted }}>
          A username is required, so this step can't be skipped.
        </Text>
      </View>
    </SlideShell>
  )
}
