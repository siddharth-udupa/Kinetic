import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ActivityCardType, PreferencesType } from "@repo/types";
import {
	formatDateAndTime,
	formatDurationShort,
	formatPace,
	metersToDistance,
	metersToElevation,
	mpsToSpeed,
} from "@repo/units";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { cssInterop } from "nativewind";
import { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { User } from "@/lib/auth-client";
import ActivityMap from "./map/Map";

// Allow `className` on the third-party components used in this card.
cssInterop(Image, { className: "style" });
cssInterop(Ionicons, { className: "style" });
cssInterop(MaterialCommunityIcons, { className: "style" });

interface ActivityCardProps {
	activity: ActivityCardType;
	preferences: PreferencesType;
	user: User;
}

const getSportIcon = (type: string, size = 22) => {
	const normalized = type?.toLowerCase() || "";

	if (normalized.includes("run") || normalized.includes("walk")) {
		return (
			<MaterialCommunityIcons name="run" size={size} className="text-brand" />
		);
	}
	if (
		normalized.includes("ride") ||
		normalized.includes("cycle") ||
		normalized.includes("bike")
	) {
		return (
			<MaterialCommunityIcons name="bike" size={size} className="text-brand" />
		);
	}
	if (normalized.includes("hike")) {
		return (
			<MaterialCommunityIcons
				name="hiking"
				size={size}
				className="text-brand"
			/>
		);
	}
	if (normalized.includes("swim")) {
		return (
			<MaterialCommunityIcons name="swim" size={size} className="text-brand" />
		);
	}
	return (
		<MaterialCommunityIcons
			name="lightning-bolt"
			size={size}
			className="text-brand"
		/>
	);
};

const getSportLabel = (type: string) => {
	const normalized = type?.toLowerCase() || "";
	if (normalized.includes("run")) return "Run";
	if (normalized.includes("walk")) return "Walk";
	if (
		normalized.includes("ride") ||
		normalized.includes("cycle") ||
		normalized.includes("bike")
	) {
		return "Ride";
	}
	if (normalized.includes("hike")) return "Hike";
	if (normalized.includes("swim")) return "Swim";
	return "Activity";
};

export default function ActivityCard({
	activity,
	preferences,
	user,
}: ActivityCardProps) {
	const router = useRouter();

	const { date: formattedDate, time: formattedTime } = formatDateAndTime(
		activity.createdAt,
		preferences?.timeFormat,
	);

	const isRunOrWalk = ["run", "walk", "hike"].some((type) =>
		activity.type?.toLowerCase().includes(type),
	);
	const isRide = ["ride", "cycle", "bike"].some((type) =>
		activity.type?.toLowerCase().includes(type),
	);

	const distanceVal = metersToDistance(
		activity.distance,
		preferences?.distanceUnit,
	);
	const distanceUnitLabel =
		preferences?.distanceUnit === "imperial" ? "mi" : "km";
	const durationStr = formatDurationShort(activity.duration);

	let elevation = { label: "Elev gain", value: activity.elevationGain };
	if (activity.elevationLoss > activity.elevationGain) {
		elevation = { label: "Elev loss", value: activity.elevationLoss };
	}

	let secondaryStatLabel = elevation.label;
	let secondaryStatValue = `${metersToElevation(elevation.value, preferences?.elevationUnit)} ${
		preferences?.elevationUnit === "feet" ? "ft" : "m"
	}`;

	if (isRunOrWalk && activity.distance > 0) {
		secondaryStatLabel = "Avg pace";
		secondaryStatValue = formatPace(
			activity.duration,
			activity.distance,
			preferences?.paceUnit ?? "min/km",
		);
	} else if (isRide && activity.distance > 0 && activity.duration > 0) {
		secondaryStatLabel = "Avg speed";
		const averageMps = activity.distance / activity.duration;
		const speedValue = mpsToSpeed(averageMps, preferences?.speedUnit ?? "km/h");
		const speedUnit =
			preferences?.speedUnit === "mph"
				? "mph"
				: preferences?.speedUnit === "m/s"
					? "m/s"
					: "km/h";
		secondaryStatValue = `${speedValue} ${speedUnit}`;
	}

	const stats = useMemo(
		() => [
			{ label: "Distance", value: `${distanceVal} ${distanceUnitLabel}` },
			{ label: secondaryStatLabel, value: secondaryStatValue },
			{ label: "Moving time", value: durationStr },
		],
		[
			distanceVal,
			distanceUnitLabel,
			durationStr,
			secondaryStatLabel,
			secondaryStatValue,
		],
	);

	const handlePressCard = () => {
		if (activity.activityId) {
			router.push(`/activities/${activity.activityId}`);
		}
	};

	return (
		<View className="w-full max-w-[680px] self-center mx-2.5 sm:mx-4 my-2 rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 md:p-6 shadow-[0_8px_20px_-14px_rgba(15,23,42,0.45)] dark:shadow-[0_10px_24px_-18px_rgba(0,0,0,0.9)]">
			<TouchableOpacity
				onPress={handlePressCard}
				activeOpacity={0.75}
				accessibilityRole="button"
				accessibilityLabel={`View activity by ${user?.name || "user"}`}
				className="w-full flex-row items-center"
			>
				{user?.image ? (
					<Image
						source={user.image}
						contentFit="cover"
						transition={150}
						className="size-12 rounded-full bg-gray-200 dark:bg-slate-800"
						accessibilityLabel={`${user?.name || "User"} profile photo`}
					/>
				) : (
					<View className="size-12 rounded-full items-center justify-center bg-gray-200 dark:bg-slate-800">
						<Ionicons
							name="person-outline"
							size={24}
							className="text-slate-500 dark:text-slate-400"
						/>
					</View>
				)}

				<View className="flex-1 min-w-0 ml-3">
					<Text
						numberOfLines={1}
						className="text-base font-bold leading-[21px] text-slate-900 dark:text-white"
					>
						{user?.name || "User"}
					</Text>
					<View className="flex-row items-center mt-0.5">
						<Ionicons
							name="calendar-outline"
							size={13}
							className="text-slate-500 dark:text-slate-400"
						/>
						<Text
							numberOfLines={1}
							className="shrink text-xs leading-4 font-medium text-slate-500 dark:text-slate-400 ml-1.5"
						>
							{formattedDate} · {formattedTime}
						</Text>
					</View>
				</View>

				<View className="size-11 ml-3 rounded-2xl items-center justify-center bg-orange-50 dark:bg-brand/20">
					{getSportIcon(activity.type)}
				</View>
			</TouchableOpacity>

			<TouchableOpacity
				onPress={handlePressCard}
				activeOpacity={0.75}
				accessibilityRole="button"
				accessibilityLabel={`Open ${activity.title || "activity"}`}
				className="mt-5 md:mt-6"
			>
				<Text className="text-[11px] leading-[15px] font-extrabold tracking-[1.1px] uppercase text-brand mb-1.5">
					{getSportLabel(activity.type)}
				</Text>
				<Text className="text-[23px] md:text-[26px] font-extrabold leading-[30px] tracking-[-0.5px] text-slate-900 dark:text-white">
					{activity.title || "Untitled activity"}
				</Text>
				{activity.description ? (
					<Text
						numberOfLines={4}
						className="mt-2 text-sm leading-[21px] text-slate-600 dark:text-slate-300"
					>
						{activity.description}
					</Text>
				) : null}
			</TouchableOpacity>

			<View className="w-full flex-row mt-5 md:mt-6 py-3.5 px-1.5 rounded-[17px] bg-slate-50 dark:bg-slate-800/70">
				{stats.map((stat, index) => (
					<View
						key={stat.label}
						className={`flex-1 min-w-0 px-2 ${
							index > 0
								? "border-l border-slate-200 dark:border-slate-700/80"
								: ""
						}`}
					>
						<Text
							numberOfLines={1}
							className="mb-1 text-[10px] leading-[14px] font-bold tracking-[0.5px] uppercase text-slate-500 dark:text-slate-400"
						>
							{stat.label}
						</Text>
						<Text
							numberOfLines={1}
							adjustsFontSizeToFit
							minimumFontScale={0.72}
							className="text-[21px] md:text-[23px] font-extrabold leading-7 tracking-[-0.4px] text-slate-900 dark:text-white"
						>
							{stat.value}
						</Text>
					</View>
				))}
			</View>

			{activity.location ? (
				<View className="flex-row items-center mt-3.5">
					<Ionicons
						name="location-outline"
						size={15}
						className="text-slate-500 dark:text-slate-400"
					/>
					<Text
						numberOfLines={1}
						className="flex-1 text-xs leading-4 font-medium text-slate-500 dark:text-slate-400 ml-1.5"
					>
						{activity.location}
					</Text>
				</View>
			) : null}

			{activity.encodedPolyline ? (
				<TouchableOpacity
					onPress={handlePressCard}
					activeOpacity={0.92}
					accessibilityRole="button"
					accessibilityLabel="Open activity map"
					className="w-full h-72 mt-4 rounded-[18px] overflow-hidden border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
				>
					<ActivityMap
						encodedPolyline={activity.encodedPolyline}
						isStatic={true}
						style={{ width: "100%", height: "100%" }}
					/>
				</TouchableOpacity>
			) : null}

			<View className="w-full flex-row items-center justify-between mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
				<Text className="flex-1 text-xs leading-4 font-medium text-slate-500 dark:text-slate-400 mr-3">
					Enjoyed this activity?
				</Text>
				<View className="flex-row items-center gap-2">
					<TouchableOpacity
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel="Give kudos"
						className="size-10 items-center justify-center rounded-[13px] border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70"
					>
						<Ionicons
							name="thumbs-up-outline"
							size={18}
							className="text-slate-600 dark:text-slate-300"
						/>
					</TouchableOpacity>
					<TouchableOpacity
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel="View comments"
						className="size-10 items-center justify-center rounded-[13px] border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70"
					>
						<Ionicons
							name="chatbubble-outline"
							size={18}
							className="text-slate-600 dark:text-slate-300"
						/>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);
}
