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

export default function RecorderScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const [activityType, setActivityType] = useState<ActivityTypes>("run");
	const [providerId, setProviderId] = useState<TileProviderId>(DEFAULT_TILE_PROVIDER);
	const [is3dMode, setIs3dMode] = useState(false);
	const [isLayerPickerOpen, setIsLayerPickerOpen] = useState(false);
	const [isActivityTypeModalOpen, setIsActivityTypeModalOpen] = useState(false);
	const [isAddRouteModalOpen, setIsAddRouteModalOpen] = useState(false);
	const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
	const [recenterTrigger, setRecenterTrigger] = useState(0);

	const recorderType = activityType === "ride" ? "ride" : "run";
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
		<View className="flex-1 bg-slate-900 relative">
			{/* Fullscreen Map Background */}
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

			{/* Top Left Back Button (Floating circular chevron down) */}
			<TouchableOpacity
				onPress={handleGoBack}
				style={{ top: Math.max(insets.top + 8, 16) }}
				className="absolute left-4 z-30 w-11 h-11 rounded-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 justify-center items-center shadow-lg active:scale-95"
				accessibilityLabel="Go back"
			>
				<Ionicons name="chevron-down" size={24} color="#111827" />
			</TouchableOpacity>

			{/* Bottom Overlay Container */}
			<View className="absolute bottom-0 left-0 right-0 z-20 justify-end">
				{/* Floating Map Action Buttons (Stack above Metrics Card) */}
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

				{/* Error Notification Banner */}
				{errorMsg && (
					<View className="mx-4 mb-2 bg-red-500/90 px-4 py-2.5 rounded-xl border border-red-400">
						<Text className="text-white text-xs font-bold text-center">
							{errorMsg}
						</Text>
					</View>
				)}

				{/* Live Activity Metrics Card */}
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

				{/* Curved bottom panel */}
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

			{/* Map Layer Switcher Modal */}
			<Modal
				visible={isLayerPickerOpen}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setIsLayerPickerOpen(false)}
			>
				<View className="flex-1 bg-black/50 justify-end">
					<View className="bg-white dark:bg-slate-900 rounded-t-3xl p-5 max-h-[70%] shadow-2xl">
						<View className="flex-row items-center justify-between mb-4 border-b border-gray-200 dark:border-slate-800 pb-3">
							<View className="flex-row items-center">
								<Ionicons name="layers" size={20} color="#FC5200" />
								<Text className="text-gray-900 dark:text-white font-bold text-lg ml-2">
									Choose Map Style
								</Text>
							</View>
							<TouchableOpacity
								onPress={() => setIsLayerPickerOpen(false)}
								className="bg-gray-100 dark:bg-slate-800 p-1.5 rounded-full"
							>
								<Ionicons name="close" size={20} color="#6B7280" />
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
												? "bg-orange-50 dark:bg-[#FC5200]/15 border-[#FC5200]"
												: "bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-800"
										}`}
									>
										<View className="flex-1 mr-2">
											<Text
												className={`font-semibold text-sm ${
													isSelected
														? "text-[#FC5200]"
														: "text-gray-900 dark:text-white"
												}`}
											>
												{provider.name}
											</Text>
										</View>
										{isSelected && (
											<Ionicons
												name="checkmark-circle"
												size={22}
												color="#FC5200"
											/>
										)}
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* Activity Type Selection Modal */}
			<ActivityTypeModal
				visible={isActivityTypeModalOpen}
				activityType={activityType}
				onSelectActivity={(type) => setActivityType(type)}
				onClose={() => setIsActivityTypeModalOpen(false)}
			/>

			{/* Route Selection Modal */}
			<RouteSelectionModal
				visible={isAddRouteModalOpen}
				selectedRoute={selectedRoute}
				onSelectRoute={(route) => setSelectedRoute(route)}
				onClose={() => setIsAddRouteModalOpen(false)}
			/>
		</View>
	);
}
