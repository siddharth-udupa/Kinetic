import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import {
  formatDurationShort,
  formatPace,
  metersToDistance,
  mpsToSpeed,
} from "@repo/units"
import MapView from "@/components/map/Map"
import ActionModal from "@/components/ui/ActionModal"
import { useActivityRecorder } from "@/hooks/useActivityRecorder"
import { useTheme } from "@/components/ui/theme"
import {
  getActiveSession,
  computeElapsedSeconds,
  type ActiveSession,
} from "@/lib/activeSessionStorage"
import { ActivityTypes } from "@repo/types"

const SPORTS: { type: ActivityTypes; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { type: "run", label: "Run", icon: "walk" },
  { type: "ride", label: "Ride", icon: "bicycle" },
  { type: "walk", label: "Walk", icon: "footsteps" },
  { type: "hike", label: "Hike", icon: "trail-sign" },
]

function getDefaultTitle(sport: string, startedAt?: number): string {
  const date = startedAt ? new Date(startedAt) : new Date()
  const hour = date.getHours()

  let timeOfDay = "Morning"
  if (hour >= 12 && hour < 17) {
    timeOfDay = "Afternoon"
  } else if (hour >= 17 && hour < 20) {
    timeOfDay = "Evening"
  } else if (hour >= 20 || hour < 5) {
    timeOfDay = "Night"
  }

  const sportName = sport.charAt(0).toUpperCase() + sport.slice(1)
  return `${timeOfDay} ${sportName}`
}

export default function SaveActivityScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const { saveRecordedActivity, discardRecordingSession } = useActivityRecorder("run")

  const [session, setSession] = useState<ActiveSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { colors, isDark } = useTheme()

  const [sportType, setSportType] = useState<ActivityTypes>("run")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  // Modals state
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false)
  const [isDiscardModalVisible, setIsDiscardModalVisible] = useState(false)

  // Load session from disk on mount
  useEffect(() => {
    let isMounted = true
    getActiveSession().then((sess) => {
      if (isMounted) {
        if (sess) {
          setSession(sess)
          const initialSport = (sess.type as ActivityTypes) || "run"
          setSportType(initialSport)
          setTitle(getDefaultTitle(initialSport, sess.startedAt))
        } else {
          setTitle(getDefaultTitle("run"))
        }
        setLoadingSession(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // When sport selection changes, update title if user hasn't heavily customized it
  const handleSelectSport = (type: ActivityTypes) => {
    setSportType(type)
    setTitle(getDefaultTitle(type, session?.startedAt))
  }

  const distanceMeters = session?.distanceMeters || 0
  const elapsedSeconds = session ? computeElapsedSeconds(session) : 0
  const points = session?.points || []
  const maxSpeedMps = session?.maxSpeedMps || 0

  const formattedDistance = metersToDistance(distanceMeters, "metric").toFixed(2)
  const formattedTime = formatDurationShort(elapsedSeconds)
  const formattedPace = formatPace(elapsedSeconds, distanceMeters, "min/km")
  const formattedMaxSpeed = mpsToSpeed(maxSpeedMps, "km/h").toFixed(1)

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Title Required", "Please enter a title for your activity.")
      return
    }

    setIsSaving(true)
    try {
      const result = await saveRecordedActivity({
        title: title.trim(),
        description: description.trim() || undefined,
        activityType: sportType,
      })

      if (result) {
        setIsSuccessModalVisible(true)
      } else {
        Alert.alert("Save Failed", "There was an error saving your activity. Please try again.")
      }
    } catch (err: any) {
      console.error("Error saving activity:", err)
      Alert.alert("Error", "An unexpected error occurred while saving.")
    } finally {
      setIsSaving(false)
    }
  }

  if (loadingSession) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color={colors.accent} />
        <Text className="text-ink-disabled text-xs font-semibold mt-3">Loading recorded data...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-page">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.card} />

      {/* White Clean Navigation Bar without buttons */}
      <View
        style={{ paddingTop: Math.max(insets.top, 35) }}
        className="bg-surface border-b border-line px-4 pb-3 justify-center items-center"
      >
        <Text className="text-ink font-bold text-lg">Save Activity</Text>
        <Text className="text-ink-muted text-[11px] font-medium">Review & publish</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 16, 28) + 90 }}
        className="flex-1"
      >
        <View className="pt-3">
          {/* 1. TITLE BOX */}
          <View className="bg-surface rounded-2xl mx-4 mb-3 p-4 border border-line-muted shadow-sm">
            <Text className="text-xs font-bold text-ink-disabled uppercase tracking-widest mb-2">
              Title <Text className="text-accent">*</Text>
            </Text>
            <View className="bg-surface-muted-hover border border-line-strong rounded-xl px-3 h-11 flex-row items-center">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Name your activity..."
                placeholderTextColor={colors.textDisabled}
                className="flex-1 text-base text-ink font-medium"
                style={{ paddingVertical: 0 }}
                maxLength={100}
              />
            </View>
          </View>

          {/* 2. DESCRIPTION */}
          <View className="bg-surface rounded-2xl mx-4 mb-3 p-4 border border-line-muted shadow-sm">
            <Text className="text-xs font-bold text-ink-disabled uppercase tracking-widest mb-2">
              Description
            </Text>
            <View className="bg-surface-muted-hover border border-line-strong rounded-xl px-3 py-2.5">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="How'd it go? Share details about your workout..."
                placeholderTextColor={colors.textDisabled}
                className="text-sm text-ink"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ minHeight: 90 }}
                maxLength={1000}
              />
            </View>
            {description.length > 800 && (
              <Text className="text-right text-[10px] text-ink-disabled mt-1">
                {description.length}/1000
              </Text>
            )}
          </View>

          {/* 3. TYPE (SPORT TYPE SELECTOR) */}
          <View className="bg-surface rounded-2xl mx-4 mb-3 p-4 border border-line-muted shadow-sm">
            <Text className="text-xs font-bold text-ink-disabled uppercase tracking-widest mb-2">
              Sport Type
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SPORTS.map((sport) => {
                const isActive = sport.type === sportType
                return (
                  <TouchableOpacity
                    key={sport.type}
                    onPress={() => handleSelectSport(sport.type)}
                    activeOpacity={0.75}
                    className={`flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-xl border ${
                      isActive
                        ? "bg-accent border-accent"
                        : "bg-surface-muted-hover border-line-strong"
                    }`}
                  >
                    <Ionicons
                      name={sport.icon}
                      size={16}
                      color={isActive ? colors.onAccent : colors.textDisabled}
                    />
                    <Text
                      className={`text-xs font-semibold ${
                        isActive ? "text-on-accent" : "text-ink"
                      }`}
                    >
                      {sport.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* 4. OVERVIEW */}
          <View className="bg-surface rounded-2xl mx-4 mb-3 p-4 border border-line-muted shadow-sm">
            <Text className="text-xs font-bold text-ink-disabled uppercase tracking-widest mb-3">
              Overview
            </Text>

            <View className="flex-row items-center justify-around py-1">
              <View className="items-center flex-1 border-r border-line-muted">
                <Text className="text-2xl font-black text-ink">
                  {formattedDistance}
                </Text>
                <Text className="text-[11px] font-semibold text-ink-disabled mt-0.5">
                  Distance (km)
                </Text>
              </View>

              <View className="items-center flex-1 border-r border-line-muted">
                <Text className="text-2xl font-black text-ink">
                  {formattedTime}
                </Text>
                <Text className="text-[11px] font-semibold text-ink-disabled mt-0.5">
                  Time
                </Text>
              </View>

              <View className="items-center flex-1">
                <Text className="text-2xl font-black text-ink">
                  {formattedPace}
                </Text>
                <Text className="text-[11px] font-semibold text-ink-disabled mt-0.5">
                  Avg Pace
                </Text>
              </View>
            </View>

            {maxSpeedMps > 0 && (
              <View className="mt-3 pt-3 border-t border-line-muted flex-row justify-between items-center px-2">
                <Text className="text-xs text-ink-muted font-medium">
                  Max Speed
                </Text>
                <Text className="text-xs font-bold text-ink">
                  {formattedMaxSpeed} km/h
                </Text>
              </View>
            )}
          </View>

          {/* 5. MAP */}
          <View className="mx-4 mb-3 rounded-2xl overflow-hidden bg-ink border border-line shadow-sm h-48 relative">
            <MapView isStatic={true} livePoints={points} />
            <View className="absolute bottom-2 left-2 bg-ink/80 px-2.5 py-1 rounded-md border border-line-strong/50 flex-row items-center">
              <Ionicons name="location-sharp" size={12} color={colors.accent} />
              <Text className="text-ink-inverse text-[11px] font-bold ml-1">
                {points.length} GPS Points Recorded
              </Text>
            </View>
          </View>

          {/* 6. DISCARD BUTTON */}
          <View className="mx-4 mb-4">
            <TouchableOpacity
              onPress={() => setIsDiscardModalVisible(true)}
              activeOpacity={0.8}
              className="w-full py-3.5 px-4 rounded-2xl bg-danger-soft border border-danger/30 items-center justify-center flex-row gap-2 active:opacity-80"
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text className="text-danger-text font-bold text-sm">
                Discard Activity
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 7. SAVE ACTIVITY BUTTON — elevated higher to avoid overlapping device menu/nav bar */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom + 16, 28) }}
        className="absolute bottom-0 left-0 right-0 bg-surface border-t border-line px-4 pt-3 shadow-xl"
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving || !title.trim()}
          activeOpacity={0.85}
          style={
            title.trim() && !isSaving
              ? {
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }
              : undefined
          }
          className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
            title.trim() && !isSaving
              ? "bg-accent"
              : "bg-disabled opacity-60"
          }`}
        >
          {isSaving ? (
            <>
              <ActivityIndicator size="small" color={colors.onAccent} />
              <Text className="text-on-accent font-bold text-sm">Saving Activity...</Text>
            </>
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={title.trim() ? colors.onAccent : colors.textDisabled}
              />
              <Text
                className={`font-bold text-sm ${
                  title.trim() ? "text-on-accent" : "text-ink-disabled"
                }`}
              >
                Save Activity
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* SUCCESS ACTION MODAL */}
      <ActionModal
        visible={isSuccessModalVisible}
        title="Activity Saved!"
        description="Your activity has been logged successfully and published to your feed."
        icon="checkmark-circle"
        iconVariant="success"
        primaryText="Go to Dashboard"
        onPrimaryPress={() => {
          setIsSuccessModalVisible(false)
          router.replace("/(app)/dashboard" as any)
        }}
        closeOnBackdropPress={false}
      />

      {/* DISCARD CONFIRMATION ACTION MODAL */}
      <ActionModal
        visible={isDiscardModalVisible}
        title="Discard Activity?"
        description="Are you sure you want to discard this recorded activity? This action cannot be undone."
        icon="trash-outline"
        iconVariant="danger"
        primaryText="Discard"
        primaryVariant="destructive"
        onPrimaryPress={async () => {
          setIsDiscardModalVisible(false)
          await discardRecordingSession()
          router.replace("/(app)/dashboard" as any)
        }}
        secondaryText="Cancel"
        onSecondaryPress={() => setIsDiscardModalVisible(false)}
        onClose={() => setIsDiscardModalVisible(false)}
      />
    </View>
  )
}
