import { useState, type ComponentProps, type ReactNode } from "react"
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/hooks/useTheme"

/** `Ionicons` is a `createIconSet`, so its prop type is only reachable through `ComponentProps`;
 *  the package exports no `IoniconsProps` helper. */
type IconName = ComponentProps<typeof Ionicons>["name"]

type AuthFieldProps = TextInputProps & {
  label: string
  icon: IconName
  /** Rendered inside the control, on the trailing edge — a reveal toggle. */
  trailing?: ReactNode
}

/** Labelled field with a leading glyph. Glyph, height and inside label make the row read as
 *  one control rather than a label plus a box. */
export function AuthField({ label, icon, trailing, style, ...inputProps }: AuthFieldProps) {
  const { colors } = useTheme()
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View
      className="flex-row items-center rounded-xl border px-4 h-14"
      style={{
        borderColor: isFocused ? colors.accent : colors.line,
        backgroundColor: colors.surface,
      }}
    >
      <Ionicons
        name={icon}
        size={18}
        color={isFocused ? colors.accent : colors.inkMuted}
        style={{ marginRight: 12 }}
      />

      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.inkMuted}
        className="flex-1 text-[16px] font-medium"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[{ color: colors.ink }, style]}
        {...inputProps}
      />

      {trailing ? <View className="ml-2">{trailing}</View> : null}
    </View>
  )
}

/** Small square press target for a trailing field affordance (reveal, clear). */
export function FieldAction({
  icon,
  label,
  onPress,
  selected,
}: {
  icon: IconName
  label: string
  onPress: () => void
  selected?: boolean
}) {
  const { colors } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-lg active:opacity-60"
      style={{ backgroundColor: colors.surfaceMuted }}
    >
      <Ionicons name={icon} size={19} color={colors.inkMuted} />
    </Pressable>
  )
}

/** Hairline + caption, used between the social button and the email form. */
export function OrDivider({ children }: { children: string }) {
  const { colors } = useTheme()

  return (
    <View className="flex-row items-center gap-3 my-6">
      <View className="flex-1 h-px" style={{ backgroundColor: colors.line }} />
      <Text className="text-[13px]" style={{ color: colors.inkMuted }}>
        {children}
      </Text>
      <View className="flex-1 h-px" style={{ backgroundColor: colors.line }} />
    </View>
  )
}

/** Social button, outlined — never a second saturated surface on the screen. */
export function SocialButton({
  children,
  onPress,
  busy = false,
  disabled = false,
}: {
  children: ReactNode
  onPress: () => void
  busy?: boolean
  disabled?: boolean
}) {
  const { colors } = useTheme()
  const blocked = disabled || busy

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy }}
      className="h-14 w-full flex-row items-center justify-center gap-2.5 rounded-2xl border active:opacity-70"
      style={{
        borderColor: colors.line,
        backgroundColor: colors.surface,
        opacity: blocked ? 0.6 : 1,
      }}
    >
      {children}
    </Pressable>
  )
}

/** Trust line under the action — the one reassurance this screen owes. */
export function TrustNote({ children }: { children: string }) {
  const { colors } = useTheme()

  return (
    <View className="flex-row items-start justify-center gap-1.5 mt-3">
      <Ionicons
        name="lock-closed-outline"
        size={13}
        color={colors.inkMuted}
        style={{ marginTop: 2 }}
      />
      <Text className="text-[12px] leading-4 text-center" style={{ color: colors.inkMuted }}>
        {children}
      </Text>
    </View>
  )
}