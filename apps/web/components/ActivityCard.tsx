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
		<article className="mx-auto my-5 w-[calc(100%-1.5rem)] max-w-2xl overflow-hidden rounded-3xl border border-line/80 bg-surface text-ink shadow-card transition-colors duration-200 sm:my-7 sm:w-[calc(100%-3rem)]">
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
							className="size-12 rounded-full object-cover ring-2 ring-surface transition-transform duration-200 hover:scale-105 sm:size-13"
						/>
						<span className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-surface bg-success" />
					</button>

					<div className="min-w-0">
						<button
							type="button"
							onClick={clickHandler}
							className="block max-w-full truncate text-left text-[15px] font-bold tracking-tight text-ink transition-colors hover:text-brand dark:hover:text-accent-text focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:text-base"
						>
							{userName || "User"}
						</button>
						<div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-medium text-ink-muted">
							<CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
							<span className="truncate">
								{formattedDate} · {formattedTime}
							</span>
						</div>
					</div>

					<div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft ring-1 ring-inset ring-accent/20 sm:size-12">
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
						<h2 className="text-[21px] font-extrabold leading-[1.2] tracking-[-0.035em] text-ink transition-colors group-hover/title:text-brand dark:group-hover/title:text-accent-text sm:text-[26px]">
							{activities.title || "Untitled activity"}
						</h2>
					</button>
					{activities.description ? (
						<p className="mt-2.5 line-clamp-4 text-sm leading-6 text-ink-secondary">
							{activities.description}
						</p>
					) : null}
				</div>

				<div className="mt-5 grid grid-cols-3 divide-x divide-line-strong rounded-2xl bg-surface-muted-hover px-2 py-3.5 ring-1 ring-inset ring-line-muted sm:mt-6 sm:px-3 sm:py-4">
					{stats.map(({ label, value, icon: StatIcon }) => (
						<div
							key={label}
							className="min-w-0 px-1.5 first:pl-1 sm:px-3 sm:first:pl-3"
						>
							<div className="flex items-center gap-1.5 text-ink-muted">
								<StatIcon
									className="hidden size-3.5 shrink-0 sm:block"
									aria-hidden="true"
								/>
								<span className="truncate text-[9px] font-bold uppercase tracking-[0.08em] sm:text-[10px]">
									{label}
								</span>
							</div>
							<p className="mt-1 truncate text-base font-extrabold tabular-nums tracking-[-0.035em] text-ink sm:text-xl">
								{value}
							</p>
						</div>
					))}
				</div>

				{activities.location ? (
					<div className="mt-3.5 flex min-w-0 items-center gap-1.5 text-xs font-medium text-ink-muted">
						<MapPin className="size-3.5 shrink-0" aria-hidden="true" />
						<span className="truncate">{activities.location}</span>
					</div>
				) : null}
			</div>

			{activities.encodedPolyline ? (
				<Link
					ref={mapContainerRef}
					href={`/activities/${activities.activityId}`}
					className="relative mx-3 block h-64 w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl border border-line bg-surface-muted sm:mx-6 sm:h-80 sm:w-[calc(100%-3rem)]"
					aria-label="Open activity map"
				>
					{isVisible ? (
						<Suspense
							fallback={
								<div className="h-full w-full animate-pulse bg-surface-muted" />
							}
						>
							<ActivityMap
								encodedPolyline={activities.encodedPolyline}
								isStatic={true}
								isChangeable={false}
							/>
						</Suspense>
					) : (
						<div className="h-full w-full bg-surface-muted" />
					)}
				</Link>
			) : null}

			<footer className="mt-4 flex items-center justify-between gap-3 border-t border-line-muted px-4 py-3.5 sm:mt-5 sm:px-6 sm:py-4">
				<p className="hidden min-w-0 truncate text-xs font-medium text-ink-muted sm:block">
					Enjoyed this activity?
				</p>
				<div className="ml-auto flex items-center gap-2">
					<button
						type="button"
						className="flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface-muted-hover px-3.5 text-sm font-semibold text-ink transition-all hover:border-accent/30 hover:bg-accent-soft hover:text-brand dark:hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98]"
						aria-label="Give kudos"
					>
						<ThumbsUp className="size-4.5" aria-hidden="true" />
						<span className="hidden sm:inline">Give kudos</span>
					</button>
					<button
						type="button"
						className="flex size-10 items-center justify-center rounded-xl border border-line-strong bg-surface-muted-hover text-ink-secondary transition-all hover:border-accent/30 hover:bg-accent-soft hover:text-brand dark:hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98]"
						aria-label="View comments"
					>
						<MessageSquare className="size-4.5" aria-hidden="true" />
					</button>
				</div>
			</footer>
		</article>
	);
}
