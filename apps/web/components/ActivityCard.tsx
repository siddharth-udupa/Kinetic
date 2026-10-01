"use client";

import type { ActivityCardType, PreferencesType } from "@repo/types";
import {
	formatDateAndTime,
	formatDurationShort,
	formatPace,
	metersToDistance,
	metersToElevation,
	mpsToSpeed,
} from "@repo/units";
import {
	Activity,
	Bike,
	CalendarDays,
	Footprints,
	Gauge,
	MapPin,
	MessageSquare,
	Mountain,
	Route,
	ThumbsUp,
	Timer,
	Waves,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

const ActivityMap = lazy(() => import("./map/Map"));

type ActivityProp = {
	activities: ActivityCardType;
	userPreferences: PreferencesType;
	userName: string;
	isVisible?: boolean;
};

const getSport = (type: string) => {
	const normalizedType = type?.toLowerCase() || "";

	if (normalizedType.includes("run") || normalizedType.includes("walk")) {
		return {
			label: normalizedType.includes("walk") ? "Walk" : "Run",
			icon: Footprints,
		};
	}
	if (
		normalizedType.includes("ride") ||
		normalizedType.includes("cycle") ||
		normalizedType.includes("bike")
	) {
		return { label: "Ride", icon: Bike };
	}
	if (normalizedType.includes("hike")) return { label: "Hike", icon: Mountain };
	if (normalizedType.includes("swim")) return { label: "Swim", icon: Waves };
	return { label: "Activity", icon: Activity };
};

export default function ActivityCard({
	activities,
	userPreferences,
	userName,
	isVisible: explicitIsVisible,
}: ActivityProp) {
	const router = useRouter();
	const mapContainerRef = useRef<HTMLAnchorElement>(null);
	const [internalIsVisible, setInternalIsVisible] = useState(false);
	const isVisible = explicitIsVisible ?? internalIsVisible;

	useEffect(() => {
		if (explicitIsVisible !== undefined) return;

		const element = mapContainerRef.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			([entry]) => setInternalIsVisible(entry.isIntersecting),
			{ threshold: 0.1 },
		);

		observer.observe(element);
		return () => observer.disconnect();
	}, [explicitIsVisible]);

	const { date: formattedDate, time: formattedTime } = formatDateAndTime(
		activities.createdAt,
		userPreferences?.timeFormat,
	);

	const normalizedType = activities.type?.toLowerCase() || "";
	const isRunOrWalk = ["run", "walk", "hike"].some((type) =>
		normalizedType.includes(type),
	);
	const isRide = ["ride", "cycle", "bike"].some((type) =>
		normalizedType.includes(type),
	);
	const sport = getSport(activities.type);
	const SportIcon = sport.icon;

	const distanceVal = metersToDistance(
		activities.distance,
		userPreferences?.distanceUnit,
	);
	const distanceUnitLabel =
		userPreferences?.distanceUnit === "imperial" ? "mi" : "km";
	const durationStr = formatDurationShort(activities.duration);

	let elevation = { label: "Elev gain", value: activities.elevationGain };
	if (activities.elevationLoss > activities.elevationGain) {
		elevation = { label: "Elev loss", value: activities.elevationLoss };
	}

	let secondaryStatLabel = elevation.label;
	let secondaryStatValue = `${metersToElevation(elevation.value, userPreferences?.elevationUnit)} ${
		userPreferences?.elevationUnit === "feet" ? "ft" : "m"
	}`;

	if (isRunOrWalk && activities.distance > 0) {
		secondaryStatLabel = "Avg pace";
		secondaryStatValue = formatPace(
			activities.duration,
			activities.distance,
			userPreferences?.paceUnit ?? "min/km",
		);
	} else if (isRide && activities.distance > 0 && activities.duration > 0) {
		secondaryStatLabel = "Avg speed";
		const averageMps = activities.distance / activities.duration;
		const speedValue = mpsToSpeed(
			averageMps,
			userPreferences?.speedUnit ?? "km/h",
		);
		const speedUnit =
			userPreferences?.speedUnit === "mph"
				? "mph"
				: userPreferences?.speedUnit === "m/s"
					? "m/s"
					: "km/h";
		secondaryStatValue = `${speedValue} ${speedUnit}`;
	}

	const stats = [
		{
			label: "Distance",
			value: `${distanceVal} ${distanceUnitLabel}`,
			icon: Route,
		},
		{
			label: secondaryStatLabel,
			value: secondaryStatValue,
			icon: Gauge,
		},
		{
			label: "Moving time",
			value: durationStr,
			icon: Timer,
		},
	];

	const clickHandler = () =>
		router.push(`/activities/${activities.activityId}`);

	return (
		<article className="mx-auto my-5 w-[calc(100%-1.5rem)] max-w-2xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white text-slate-900 shadow-[0_10px_35px_-18px_rgba(15,23,42,0.28)] transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 sm:my-7 sm:w-[calc(100%-3rem)] dark:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.8)]">
			<div className="p-4 sm:p-6">
				<header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
					<button
						type="button"
						onClick={clickHandler}
						className="relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
						aria-label={`View activities by ${userName || "user"}`}
					>
						<Image
							width={48}
							height={48}
							src="/temphoto.png"
							alt={userName || "User Profile"}
							className="size-12 rounded-full object-cover ring-2 ring-white transition-transform duration-200 hover:scale-105 dark:ring-slate-900 sm:size-13"
						/>
						<span className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
					</button>

					<div className="min-w-0">
						<button
							type="button"
							onClick={clickHandler}
							className="block max-w-full truncate text-left text-[15px] font-bold tracking-tight text-slate-900 transition-colors hover:text-brand focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:text-base dark:text-white dark:hover:text-orange-400"
						>
							{userName || "User"}
						</button>
						<div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
							<CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
							<span className="truncate">
								{formattedDate} · {formattedTime}
							</span>
						</div>
					</div>

					<div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 ring-1 ring-inset ring-orange-100 dark:bg-orange-500/15 dark:ring-orange-500/20 sm:size-12">
						<SportIcon
							className="size-5 text-brand sm:size-5.5"
							strokeWidth={2.25}
							aria-hidden="true"
						/>
					</div>
				</header>

				<div className="mt-5 sm:mt-6">
					<p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand">
						{sport.label}
					</p>
					<button
						type="button"
						onClick={clickHandler}
						className="group/title mt-1.5 block w-full text-left focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
					>
						<h2 className="text-[21px] font-extrabold leading-[1.2] tracking-[-0.035em] text-slate-950 transition-colors group-hover/title:text-brand sm:text-[26px] dark:text-white dark:group-hover/title:text-orange-400">
							{activities.title || "Untitled activity"}
						</h2>
					</button>
					{activities.description ? (
						<p className="mt-2.5 line-clamp-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
							{activities.description}
						</p>
					) : null}
				</div>

				<div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl bg-slate-50 px-2 py-3.5 ring-1 ring-inset ring-slate-100 sm:mt-6 sm:px-3 sm:py-4 dark:divide-slate-700/80 dark:bg-slate-800/65 dark:ring-slate-700/70">
					{stats.map(({ label, value, icon: StatIcon }) => (
						<div
							key={label}
							className="min-w-0 px-1.5 first:pl-1 sm:px-3 sm:first:pl-3"
						>
							<div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
								<StatIcon
									className="hidden size-3.5 shrink-0 sm:block"
									aria-hidden="true"
								/>
								<span className="truncate text-[9px] font-bold uppercase tracking-[0.08em] sm:text-[10px]">
									{label}
								</span>
							</div>
							<p className="mt-1 truncate text-base font-extrabold tabular-nums tracking-[-0.035em] text-slate-950 sm:text-xl dark:text-white">
								{value}
							</p>
						</div>
					))}
				</div>

				{activities.location ? (
					<div className="mt-3.5 flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
						<MapPin className="size-3.5 shrink-0" aria-hidden="true" />
						<span className="truncate">{activities.location}</span>
					</div>
				) : null}
			</div>

			{activities.encodedPolyline ? (
				<Link
					ref={mapContainerRef}
					href={`/activities/${activities.activityId}`}
					className="relative mx-3 block h-64 w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:mx-6 sm:h-80 sm:w-[calc(100%-3rem)] dark:border-slate-800 dark:bg-slate-800"
					aria-label="Open activity map"
				>
					{isVisible ? (
						<Suspense
							fallback={
								<div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800" />
							}
						>
							<ActivityMap
								encodedPolyline={activities.encodedPolyline}
								isStatic={true}
								isChangeable={false}
							/>
						</Suspense>
					) : (
						<div className="h-full w-full bg-slate-100 dark:bg-slate-800" />
					)}
				</Link>
			) : null}

			<footer className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3.5 sm:mt-5 sm:px-6 sm:py-4 dark:border-slate-800">
				<p className="hidden min-w-0 truncate text-xs font-medium text-slate-500 sm:block dark:text-slate-400">
					Enjoyed this activity?
				</p>
				<div className="ml-auto flex items-center gap-2">
					<button
						type="button"
						className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-orange-500/30 dark:hover:bg-orange-500/10 dark:hover:text-orange-400"
						aria-label="Give kudos"
					>
						<ThumbsUp className="size-4.5" aria-hidden="true" />
						<span className="hidden sm:inline">Give kudos</span>
					</button>
					<button
						type="button"
						className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:border-orange-500/30 dark:hover:bg-orange-500/10 dark:hover:text-orange-400"
						aria-label="View comments"
					>
						<MessageSquare className="size-4.5" aria-hidden="true" />
					</button>
				</div>
			</footer>
		</article>
	);
}
