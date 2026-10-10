import type { ReactNode } from "react"
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { COLORS, getColors } from "@repo/shared"
import { useTheme } from "../theme"
import type { OnboardingPrefs } from "@/hooks/useOnboarding"

export type IconName = keyof typeof Ionicons.glyphMap

/**
 * A preference value narrowed to a string.
 *
 * Every `OnboardingPrefs` field is a string union, but TypeScript cannot prove
 * that for an unresolved `K extends keyof OnboardingPrefs`. The intersection
 * gives the generic components below something they can constrain on.
 */
export type PrefValue<K extends keyof OnboardingPrefs> = OnboardingPrefs[K] & string

/* ── Layout ────────────────────────────────────────────────────────────── */

/**
 * The frame every slide shares: a scrolling body and an optional footer that
 * stays pinned to the bottom.
 *
 * Pinning the action keeps the primary button in the same place on every slide
 * (so it never has to be hunted for), and `flexGrow` lets a short slide breathe
 * instead of stretching its own contents.
 */
export function SlideShell({
  children,
  footer,
  center = false,
}: {
  children: ReactNode
  footer?: ReactNode
  center?: boolean
}) {
  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: footer ? 16 : 28,
          justifyContent: center ? "center" : "flex-start",
        }}
      >
        {children}
      </ScrollView>
      {footer ? <View className="px-6 pt-1 pb-1">{footer}</View> : null}
    </View>
  )
}

/**
 * Icon plate, heading and subheading.
 *
 * The plate is a low-contrast accent tint rather than a solid brand block — on
 * the old slides a row of these competed with the buttons underneath them.
 */
export function SlideHeading({
  icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon?: IconName
  eyebrow?: string
  title: string
  subtitle?: string
}) {
  const { colors } = useTheme()

  return (
    <View className="mb-7">
      {icon ? (
        <View className="mb-5">
          <IconBadge icon={icon} />
        </View>
      ) : null}

      {eyebrow ? (
        <Text
          className="text-xs font-semibold uppercase tracking-widest mb-2.5"
          style={{ color: colors.accentText }}
        >
          {eyebrow}
        </Text>
      ) : null}

      <Text
        className="text-[28px] leading-9 font-bold"
        style={{ color: colors.text }}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          className="text-[15px] leading-6 mt-3"
          style={{ color: colors.textSecondary }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}

export function IconBadge({
  icon,
  size = 48,
}: {
  icon: IconName
  size?: number
}) {
  const { colors } = useTheme()

  return (
    <View
      className="items-center justify-center rounded-2xl"
      style={{ width: size, height: size, backgroundColor: colors.accentSoft }}
    >
      <Ionicons
        name={icon}
        size={Math.round(size * 0.46)}
        color={colors.accent}
      />
    </View>
  )
}

/* ── Buttons ───────────────────────────────────────────────────────────── */

/**
 * The one saturated surface allowed on a slide.
 *
 * Keeping a single accent-filled element per screen is what stops the flow
 * reading as a wall of competing buttons — every other control in the flow is
 * outlined, tinted or text-only.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  icon?: IconName
}) {
  const { colors } = useTheme()
  const blocked = disabled && !loading
  const contentColor = blocked ? colors.textMuted : colors.onAccent

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className="h-14 w-full rounded-2xl flex-row items-center justify-center gap-2 active:opacity-80"
      style={{ backgroundColor: blocked ? colors.cardMuted : colors.accent }}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <>
          <Text className="text-[16px] font-semibold" style={{ color: contentColor }}>
            {label}
          </Text>
          {icon ? <Ionicons name={icon} size={18} color={contentColor} /> : null}
        </>
      )}
    </Pressable>
  )
}

export function GhostButton({
  label,
  onPress,
  icon,
}: {
  label: string
  onPress: () => void
  icon?: IconName
}) {
  const { colors } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-14 flex-1 rounded-2xl flex-row items-center justify-center gap-2 border active:opacity-70"
      style={{ borderColor: colors.border, backgroundColor: colors.card }}
    >
      <Text className="text-[15px] font-semibold" style={{ color: colors.textSecondary }}>
        {label}
      </Text>
      {icon ? <Ionicons name={icon} size={17} color={colors.textMuted} /> : null}
    </Pressable>
  )
}

/** Low-emphasis inline action for "…or just accept the default" moments. */
export function TextAction({
  label,
  onPress,
  icon = "chevron-forward",
}: {
  label: string
  onPress: () => void
  icon?: IconName
}) {
  const { colors } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className="self-start flex-row items-center gap-1 py-2 active:opacity-60"
    >
      <Text className="text-sm font-semibold" style={{ color: colors.accentText }}>
        {label}
      </Text>
      <Ionicons name={icon} size={14} color={colors.accentText} />
    </Pressable>
  )
}

/* ── Selection controls ────────────────────────────────────────────────── */

/**
 * Selected state is a border, a tint and a filled dot — never a solid fill.
 * The old options were full-colour blocks, so a glance could not tell which of
 * them was actually chosen.
 */
export function RadioDot({ selected }: { selected: boolean }) {
  const { colors } = useTheme()

  return (
    <View
      className="h-5 w-5 rounded-full items-center justify-center border-2"
      style={{ borderColor: selected ? colors.accent : colors.borderStrong }}
    >
      {selected ? (
        <View
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: colors.accent }}
        />
      ) : null}
    </View>
  )
}

export function ChoiceCard({
  icon,
  title,
  subtitle,
  chips,
  selected,
  onPress,
}: {
  icon: IconName
  title: string
  subtitle: string
  chips?: string[]
  selected: boolean
  onPress: () => void
}) {
  const { colors } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      className="w-full rounded-2xl border-2 p-5 mb-3 active:opacity-80"
      style={{
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accentSoft : colors.card,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View
          className="h-11 w-11 rounded-xl items-center justify-center"
          style={{ backgroundColor: selected ? colors.accent : colors.cardMuted }}
        >
          <Ionicons
            name={icon}
            size={20}
            color={selected ? colors.onAccent : colors.textSecondary}
          />
        </View>
        <RadioDot selected={selected} />
      </View>

      <Text className="text-[17px] font-semibold mt-4" style={{ color: colors.text }}>
        {title}
      </Text>
      <Text className="text-[14px] leading-5 mt-1" style={{ color: colors.textSecondary }}>
        {subtitle}
      </Text>

      {chips ? (
        <View className="flex-row gap-2 mt-3.5">
          {chips.map((chip) => (
            <View
              key={chip}
              className="px-2.5 py-1 rounded-md"
              style={{ backgroundColor: colors.cardMuted }}
            >
              <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                {chip}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  )
}

/**
 * Segmented control on a muted track, with the chosen option lifted onto a
 * raised pill. Reads as a physical control rather than a row of buttons.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (value: T) => void
}) {
  const { colors } = useTheme()

  return (
    <View
      className="flex-row rounded-xl p-1 gap-1"
      style={{ backgroundColor: colors.cardMuted }}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            className="flex-1 h-10 rounded-lg items-center justify-center px-1 border active:opacity-70"
            style={{
              backgroundColor: selected ? colors.raised : "transparent",
              borderColor: selected ? colors.raisedBorder : "transparent",
            }}
          >
            <Text
              className="text-[13px] font-semibold"
              numberOfLines={1}
              style={{ color: selected ? colors.accentText : colors.textSecondary }}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** A labelled segmented control — the repeating unit of the units screen. */
export function SettingRow<K extends keyof OnboardingPrefs>({
  label,
  icon,
  options,
  value,
  onChange,
}: {
  label: string
  icon: IconName
  options: { label: string; value: PrefValue<K> }[]
  value: PrefValue<K>
  onChange: (value: PrefValue<K>) => void
}) {
  const { colors } = useTheme()

  return (
    <View className="mb-4">
      <View className="flex-row items-center gap-2 mb-2.5">
        <Ionicons name={icon} size={15} color={colors.textMuted} />
        <Text className="text-[13px] font-semibold" style={{ color: colors.textSecondary }}>
          {label}
        </Text>
      </View>
      <Segmented options={options} value={value} onChange={onChange} />
    </View>
  )
}

/* ── Content blocks ────────────────────────────────────────────────────── */

export function Banner({
  tone,
  icon,
  children,
}: {
  tone: "info" | "danger"
  icon: IconName
  children: ReactNode
}) {
  const { colors } = useTheme()
  const isDanger = tone === "danger"

  return (
    <View
      className="flex-row items-start gap-2.5 rounded-xl px-3.5 py-3 mb-4"
      style={{ backgroundColor: isDanger ? colors.dangerSoft : colors.accentSoft }}
    >
      <Ionicons
        name={icon}
        size={16}
        color={isDanger ? colors.danger : colors.accent}
        style={{ marginTop: 1 }}
      />
      <Text
        className="flex-1 text-[13px] leading-5"
        style={{ color: isDanger ? colors.danger : colors.textSecondary }}
      >
        {children}
      </Text>
    </View>
  )
}

export function Chip({ label }: { label: string }) {
  const { colors } = useTheme()

  return (
    <View
      className="px-2.5 py-1 rounded-md"
      style={{ backgroundColor: colors.cardMuted }}
    >
      <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
        {label}
      </Text>
    </View>
  )
}

export function ReviewRow({
  label,
  value,
  onPress,
  isLast = false,
}: {
  label: string
  value: string
  onPress: () => void
  isLast?: boolean
}) {
  const { colors } = useTheme()

  return (
    <>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}. Change`}
        className="flex-row items-center justify-between py-3.5 active:opacity-60"
      >
        <Text className="text-[15px]" style={{ color: colors.textSecondary }}>
          {label}
        </Text>
        <View className="flex-row items-center gap-1.5 flex-1 justify-end pl-4">
          <Text className="text-[15px] font-semibold" numberOfLines={1} style={{ color: colors.text }}>
            {value}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </Pressable>
      {isLast ? null : (
        <View className="h-px" style={{ backgroundColor: colors.border }} />
      )}
    </>
  )
}

export function ReviewSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const { colors } = useTheme()

  return (
    <View className="mb-4">
      <Text
        className="text-xs font-semibold uppercase tracking-widest mb-2.5"
        style={{ color: colors.textMuted }}
      >
        {title}
      </Text>
      <View
        className="rounded-2xl px-4 border"
        style={{ borderColor: colors.border, backgroundColor: colors.card }}
      >
        {children}
      </View>
    </View>
  )
}

/** Hoisted: declared inside the renderer, it would remount on every render. */
function PreviewHalf({ tone }: { tone: "light" | "dark" }) {
  // Deliberately the palette for `tone` rather than the live one — showing the
  // theme the athlete has not picked yet is the whole point of the thumbnail.
  const p = getColors(tone)
  return (
    <View className="flex-1 h-full px-1.5 py-2" style={{ backgroundColor: p.card }}>
      <View className="h-1 w-4 rounded-full mb-1" style={{ backgroundColor: p.borderStrong }} />
      <View className="h-1 w-6 rounded-full mb-1" style={{ backgroundColor: p.border }} />
      <View className="h-1 w-5 rounded-full" style={{ backgroundColor: p.accent }} />
    </View>
  )
}

/**
 * Miniature of the app in a given theme, so the choice is made by looking
 * rather than by reading a label.
 */
export function ThemePreview({ scheme }: { scheme: "light" | "dark" | "system" }) {
  const dominant = scheme === "system" ? "light" : scheme

  return (
    <View
      className="h-16 w-full rounded-xl overflow-hidden border"
      style={{ borderColor: getColors(dominant).borderStrong }}
    >
      <View className="flex-1 flex-row">
        {scheme === "system" ? (
          <>
            <PreviewHalf tone="light" />
            <View className="w-px" style={{ backgroundColor: COLORS.light.textDisabled }} />
            <PreviewHalf tone="dark" />
          </>
        ) : (
          <PreviewHalf tone={scheme} />
        )}
      </View>
    </View>
  )
}
