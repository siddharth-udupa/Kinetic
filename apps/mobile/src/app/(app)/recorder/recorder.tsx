import { Ionicons } from "@expo/vector-icons";
import {
	DEFAULT_TILE_PROVIDER,
	type TileProviderId,
	tileProviders,
} from "@repo/maps";
import {
	formatDurationShort,
	formatPace,
	metersToDistance,
	mpsToSpeed,
} from "@repo/units";
import type { ActivityTypes } from "@repo/types";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	Alert,
	Modal,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView from "@/components/map/Map";
import ActivityTypeModal from "@/components/ui/recorder/ActivityTypeModal";
import BottomControlPanel from "@/components/ui/recorder/BottomControlPanel";
import FloatingMapControls from "@/components/ui/recorder/FloatingMapControls";
import LiveMetricsCard from "@/components/ui/recorder/LiveMetricsCard";
import RouteSelectionModal from "@/components/ui/recorder/RouteSelectionModal";
import { useActivityRecorder } from "@/hooks/useActivityRecorder";
import { useTheme } from "@/hooks/useTheme";

export default function RecorderScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { colors } = useTheme();

	const [activityType, setActivityType] = useState<ActivityTypes>("run");
	const [providerId, setProviderId] = useState<TileProviderId>(DEFAULT_TILE_PROVIDER);
	const [is3dMode, setIs3dMode] = useState(false);
	const [isLayerPickerOpen, setIsLayerPickerOpen] = useState(false);
	const [isActivityTypeModalOpen, setIsActivityTypeModalOpen] = useState(false);
	const [isAddRouteModalOpen, setIsAddRouteModalOpen] = useState(false);
	const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
	const [recenterTrigger, setRecenterTrigger] = useState(0);

	const recorderType = activityType === "ride" ? "ride" : "run";
	// A foreground service keeps tracking alive while the app is off-screen.
	const {
		status,
		locationStatus,
		currentPoint,
		points,
		distanceMeters,
		elapsedSeconds,
		currentSpeedMps,
		isBackgroundActive,
		errorMsg,
		startRecording,
		pauseRecording,
		resumeRecording,
		finishRecordingSession,
		requestLocationPermissions,
	} = useActivityRecorder(recorderType);

	const handleGoBack = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace("/(app)/dashboard" as any);
		}
	};

	const handleFinish = async () => {
		await finishRecordingSession();
		router.push("/(app)/recorder/save" as any);
	};

	const handleRecenterLocation = () => {
		if (currentPoint) {
			setRecenterTrigger((prev) => prev + 1);
		} else {
			requestLocationPermissions();
		}
	};

	const formattedDistance = metersToDistance(distanceMeters, "metric").toFixed(2);
	const formattedTime = formatDurationShort(elapsedSeconds);
	const formattedPace = formatPace(elapsedSeconds, distanceMeters, "min/km");
	const formattedSpeed = mpsToSpeed(currentSpeedMps, "km/h").toFixed(1);

	return (
		<View className="flex-1 bg-ink relative">
			<View className="absolute inset-0">
				<MapView
					providerId={providerId}
					isStatic={false}
					userLocation={
						currentPoint
							? {
									latitude: currentPoint.latitude,
									longitude: currentPoint.longitude,
								}
							: null
					}
					livePoints={points}
					recenterTrigger={recenterTrigger}
				/>
			</View>

			<TouchableOpacity
				onPress={handleGoBack}
				style={{ top: Math.max(insets.top + 8, 16) }}
				className="absolute left-4 z-30 w-11 h-11 rounded-full bg-surface border border-line justify-center items-center shadow-lg active:scale-95"
				accessibilityLabel="Go back"
			>
				<Ionicons name="chevron-down" size={24} color={colors.ink} />
			</TouchableOpacity>

			<View className="absolute bottom-0 left-0 right-0 z-20 justify-end">
				<FloatingMapControls
					is3dMode={is3dMode}
					onOpenLayerPicker={() => setIsLayerPickerOpen(true)}
					onToggle3dMode={() => setIs3dMode((prev) => !prev)}
					onRecenterLocation={handleRecenterLocation}
					onOpenInfo={() =>
						Alert.alert(
							"Map Info",
							`Active Style: ${tileProviders[providerId]?.name || providerId}`,
						)
					}
				/>

				{errorMsg && (
					<View className="mx-4 mb-2 bg-danger px-4 py-2.5 rounded-xl border border-danger-hover">
						<Text className="text-on-accent text-xs font-bold text-center">
							{errorMsg}
						</Text>
					</View>
				)}

				<LiveMetricsCard
					formattedTime={formattedTime}
					formattedPace={formattedPace}
					formattedSpeed={formattedSpeed}
					formattedDistance={formattedDistance}
					activityType={activityType}
					status={status}
					locationStatus={locationStatus}
					pointsCount={points.length}
					distanceMeters={distanceMeters}
					isBackgroundActive={isBackgroundActive}
					onRequestPermissions={requestLocationPermissions}
				/>

				<BottomControlPanel
					status={status}
					activityType={activityType}
					selectedRoute={selectedRoute}
					bottomInset={insets.bottom}
					onOpenActivityModal={() => setIsActivityTypeModalOpen(true)}
					onStartRecording={startRecording}
					onPauseRecording={pauseRecording}
					onResumeRecording={resumeRecording}
					onFinishRecording={handleFinish}
					onOpenRouteModal={() => setIsAddRouteModalOpen(true)}
				/>
			</View>

			<Modal
				visible={isLayerPickerOpen}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setIsLayerPickerOpen(false)}
			>
				<View className="flex-1 bg-overlay justify-end">
					<View className="bg-surface rounded-t-3xl p-5 max-h-[70%] shadow-2xl">
						<View className="flex-row items-center justify-between mb-4 border-b border-line pb-3">
							<View className="flex-row items-center">
								<Ionicons name="layers" size={20} color={colors.accent} />
								<Text className="text-ink font-bold text-lg ml-2">
									Choose Map Style
								</Text>
							</View>
							<TouchableOpacity
								onPress={() => setIsLayerPickerOpen(false)}
								className="bg-surface-muted p-1.5 rounded-full"
							>
								<Ionicons name="close" size={20} color={colors.inkMuted} />
							</TouchableOpacity>
						</View>

						<ScrollView className="space-y-2">
							{(Object.keys(tileProviders) as TileProviderId[]).map((key) => {
								const provider = tileProviders[key];
								const isSelected = providerId === key;
								return (
									<TouchableOpacity
										key={key}
										onPress={() => {
											setProviderId(key);
											setIsLayerPickerOpen(false);
										}}
										className={`p-3.5 rounded-xl border flex-row items-center justify-between my-1 ${
											isSelected
												? "bg-accent-soft border-accent"
												: "bg-surface-muted-hover border-line"
										}`}
									>
										<View className="flex-1 mr-2">
											<Text
												className={`font-semibold text-sm ${
													isSelected
														? "text-accent"
														: "text-ink"
												}`}
											>
												{provider.name}
											</Text>
										</View>
										{isSelected && (
											<Ionicons
												name="checkmark-circle"
												size={22}
												color={colors.accent}
											/>
										)}
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</View>
				</View>
			</Modal>

			<ActivityTypeModal
				visible={isActivityTypeModalOpen}
				activityType={activityType}
				onSelectActivity={(type) => setActivityType(type)}
				onClose={() => setIsActivityTypeModalOpen(false)}
			/>

			<RouteSelectionModal
				visible={isAddRouteModalOpen}
				selectedRoute={selectedRoute}
				onSelectRoute={(route) => setSelectedRoute(route)}
				onClose={() => setIsAddRouteModalOpen(false)}
			/>
		</View>
	);
}
