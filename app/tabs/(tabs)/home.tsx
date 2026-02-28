import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";

import { Box } from "@/components/ui/box";
import {
	Avatar,
	AvatarFallbackText,
	AvatarImage,
} from "@/components/ui/avatar";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Image } from "@/components/ui/image";

import {
	Bell,
	ChevronRight,
	Clock3,
	Dumbbell,
	Flame,
	Footprints,
	Search,
	Zap,
} from "lucide-react-native";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";

type MetricItem = {
	id: string;
	value: string;
	label: string;
	progress: number;
	icon: React.ComponentType<{
		size?: number;
		color?: string;
		strokeWidth?: number;
	}>;
};

type WorkoutItem = {
	id: string;
	day: string;
	title: string;
	reps: string;
	duration: string;
	energy: string;
	image: string;
};

const metrics: MetricItem[] = [
	{
		id: "steps",
		value: "3,458",
		label: "steps",
		progress: 24,
		icon: Footprints,
	},
	{
		id: "energy",
		value: "548 kcal",
		label: "energy",
		progress: 24,
		icon: Flame,
	},
	{
		id: "activity",
		value: "1h 25m",
		label: "activity",
		progress: 24,
		icon: Dumbbell,
	},
];

const workouts: WorkoutItem[] = [
	{
		id: "monday",
		day: "Monday",
		title: "Full Body Strength Training",
		reps: "3x12 reps",
		duration: "48 min",
		energy: "280 kcal",
		image:
			"https://cdn3d.iconscout.com/3d/premium/thumb/driver-3d-icon-png-download-4403853.png",
	},
	{
		id: "tuesday",
		day: "Tuesday",
		title: "Upper Body Strength",
		reps: "2x12 reps",
		duration: "24 min",
		energy: "265 kcal",
		image:
			"https://cdn3d.iconscout.com/3d/premium/thumb/taxi-driver-man-3d-icon-png-download-5250839.png",
	},
];

const METRIC_RING_COLOR = "#F6B81D";

function colorWithAlpha(color: string, alpha: number) {
	const normalized = color.trim();
	if (normalized.startsWith("rgb(")) {
		const values = normalized
			.replace("rgb(", "")
			.replace(")", "")
			.split(",")
			.map((item) => item.trim())
			.slice(0, 3);
		if (values.length === 3) {
			return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
		}
	}

	if (normalized.startsWith("#")) {
		const hex = normalized.slice(1);
		const fullHex =
			hex.length === 3
				? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
				: hex;
		if (fullHex.length === 6) {
			const r = Number.parseInt(fullHex.slice(0, 2), 16);
			const g = Number.parseInt(fullHex.slice(2, 4), 16);
			const b = Number.parseInt(fullHex.slice(4, 6), 16);
			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		}
	}

	return color;
}

function MetricCard({
	item,
	palette,
}: {
	item: MetricItem;
	palette: (typeof Colors)["light"] | (typeof Colors)["dark"];
}) {
	const Icon = item.icon;
	const size = 55;
	const strokeWidth = 2;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const clampedProgress = Math.max(0, Math.min(100, item.progress));
	const dashOffset = circumference * (1 - clampedProgress / 100);

	return (
		<Box className="flex-1 rounded-[28px] bg-card p-2">
			<Box className="relative ml-0.5 mt-0.5 shadow-lg h-[55px] w-[55px] rounded-full items-center justify-center">
				<Svg width={size} height={size} style={{ position: "absolute" }}>
					<Circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						stroke={colorWithAlpha(palette.tabIconDefault, 0.2)}
						strokeWidth={strokeWidth}
						fill="none"
					/>
					<Circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						stroke={METRIC_RING_COLOR}
						strokeWidth={strokeWidth}
						fill="none"
						strokeLinecap="round"
						strokeDasharray={`${circumference} ${circumference}`}
						strokeDashoffset={dashOffset}
						transform={`rotate(-90 ${size / 2} ${size / 2})`}
					/>
				</Svg>
				<Box className="w-10 h-10 bg-foreground/10 justify-center items-center rounded-full">
					<Icon size={19} color={palette.text} strokeWidth={2} />
				</Box>
			</Box>

			<Box className="px-2 py-3">
				<Text
					className="text-base font-semibold"
					style={{ color: palette.text }}
					numberOfLines={1}
					adjustsFontSizeToFit
					minimumFontScale={0.78}
				>
					{item.value}
				</Text>
				<Text className="text-xs" style={{ color: palette.tabIconDefault }}>
					{item.label}
				</Text>
			</Box>
		</Box>
	);
}

function WorkoutCard({
	item,
	palette,
	isDark,
	index,
}: {
	item: WorkoutItem;
	palette: (typeof Colors)["light"] | (typeof Colors)["dark"];
	isDark: boolean;
	index: number;
}) {
	const textOnCard = isDark ? Colors.dark.text : Colors.light.background;
	const gradientColors: [string, string] =
		index % 2 === 0
			? [
					colorWithAlpha(palette.tint, isDark ? 0.42 : 0.32),
					colorWithAlpha(palette.tint, isDark ? 0.75 : 0.56),
				]
			: [
					colorWithAlpha(palette.tabIconDefault, isDark ? 0.58 : 0.34),
					colorWithAlpha(palette.tint, isDark ? 0.52 : 0.42),
				];

	return (
		<LinearGradient
			colors={gradientColors}
			start={{ x: 0, y: 0 }}
			end={{ x: 1, y: 1 }}
			style={{
				borderRadius: 24,
				overflow: "hidden",
				minHeight: 200,
				padding: 16,
				position: "relative",
			}}
		>
			<Image
				className="absolute right-0 bottom-0 w-[150px] h-[150px]"
				source={{ uri: item.image }}
				alt={item.title}
				resizeMode="cover"
			/>

			<Box className="max-w-[70%]">
				<Box
					className="self-start rounded-full px-3 py-1.5"
					style={{
						borderWidth: 1,
						borderColor: colorWithAlpha(textOnCard, 0.35),
						backgroundColor: colorWithAlpha(textOnCard, 0.12),
					}}
				>
					<Text className="text-sm font-medium" style={{ color: textOnCard }}>
						{item.day}
					</Text>
				</Box>

				<Heading
					className="mt-3 text-2xl font-semibold leading-8"
					style={{ color: textOnCard }}
				>
					{item.title}
				</Heading>
			</Box>

			<Box className="mt-5 flex-row items-center gap-2">
				<Box
					className="rounded-full px-3 py-1.5"
					style={{ backgroundColor: colorWithAlpha(textOnCard, 0.16) }}
				>
					<Text className="text-sm font-medium" style={{ color: textOnCard }}>
						{item.reps}
					</Text>
				</Box>
				<Box
					className="rounded-full px-3 py-1.5 flex-row items-center gap-1"
					style={{ backgroundColor: colorWithAlpha(textOnCard, 0.16) }}
				>
					<Clock3 size={14} color={textOnCard} />
					<Text className="text-sm font-medium" style={{ color: textOnCard }}>
						{item.duration}
					</Text>
				</Box>
				<Box
					className="rounded-full px-3 py-1.5 flex-row items-center gap-1"
					style={{ backgroundColor: colorWithAlpha(textOnCard, 0.16) }}
				>
					<Zap size={14} color={textOnCard} />
					<Text className="text-sm font-medium" style={{ color: textOnCard }}>
						{item.energy}
					</Text>
				</Box>
			</Box>
		</LinearGradient>
	);
}

export default function HomeScreen() {
	const { colorMode } = useAppTheme();
	const { user } = useAuth();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;

	const rawNameFromMeta =
		typeof user?.user_metadata?.given_name === "string" &&
		user.user_metadata.given_name.trim().length > 0
			? user.user_metadata.given_name
			: typeof user?.user_metadata?.full_name === "string" &&
				  user.user_metadata.full_name.trim().length > 0
				? user.user_metadata.full_name
				: typeof user?.user_metadata?.name === "string" &&
					  user.user_metadata.name.trim().length > 0
					? user.user_metadata.name
					: "";

	const firstNameFromMeta = rawNameFromMeta.split(/\s+/)[0] ?? "";
	const firstNameFromEmail = (user?.email?.split("@")[0] ?? "Foydalanuvchi")
		.split(/[._-]/)[0]
		.trim();
	const displayName =
		firstNameFromMeta.trim().length > 0
			? firstNameFromMeta
			: firstNameFromEmail;

	const [now, setNow] = React.useState(() => new Date());
	React.useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), 60_000);
		return () => clearInterval(interval);
	}, []);

	const subtitle = React.useMemo(() => {
		const hour = now.getHours();
		if (hour >= 5 && hour < 12) return "Hayrli tong";
		if (hour >= 12 && hour < 18) return "Hayrli kun";
		if (hour >= 18 && hour < 23) return "Hayrli kech";
		return "Hayrli tun";
	}, [now]);

	const rawAvatar =
		user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;
	const avatarUri =
		typeof rawAvatar === "string" && rawAvatar.trim().length > 0
			? rawAvatar
			: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80";

	return (
		<Box className="pt-safe flex-1 bg-background">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
			>
				<Box className="mx-4 android:mt-3 flex-row items-center justify-between">
					<Box className="flex-1 flex-row items-center gap-3">
						<Avatar className="h-12 w-12">
							<AvatarFallbackText>{displayName}</AvatarFallbackText>
							<AvatarImage source={{ uri: avatarUri }} />
						</Avatar>

						<Box className="flex-1 min-w-0">
							<Text
								numberOfLines={1}
								ellipsizeMode="tail"
								className="text-sm"
								style={{ color: palette.tabIconDefault }}
							>
								{`${subtitle},`}
							</Text>
							<Heading
								numberOfLines={1}
								ellipsizeMode="tail"
								className="text-xl font-semibold"
							>
								{displayName}
							</Heading>
						</Box>
					</Box>

					<Box className="flex-row items-center gap-3">
						<Pressable>
							<Box className="h-12 w-12 border border-border rounded-full items-center justify-center">
								<Search size={20} color={palette.text} strokeWidth={2} />
							</Box>
						</Pressable>

						<Pressable>
							<Box className="h-12 w-12 rounded-full border-border border items-center justify-center">
								<Bell size={20} color={palette.text} strokeWidth={2} />
								<View
									style={{
										position: "absolute",
										right: 14,
										top: 14,
										height: 8,
										width: 8,
										borderRadius: 999,
										backgroundColor: palette.tint,
									}}
								/>
							</Box>
						</Pressable>
					</Box>
				</Box>

				<Box className="mt-6 mx-4 flex-row items-center justify-between">
					<Heading
						className="text-2xl font-semibold"
						style={{ color: palette.text }}
					>
						Today
					</Heading>
					<Pressable className="flex-row items-center gap-1">
						<Text
							className="text-base font-medium"
							style={{ color: palette.tint }}
						>
							Activity
						</Text>
						<ChevronRight size={18} color={palette.tint} />
					</Pressable>
				</Box>

				<Box className="mx-4 mt-4 flex-row items-center gap-2">
					{metrics.map((item) => (
						<MetricCard key={item.id} item={item} palette={palette} />
					))}
				</Box>

				<Box className="mt-7 mx-4 flex-row items-center justify-between">
					<Heading
						className="text-2xl font-semibold"
						style={{ color: palette.text }}
					>
						Workout Plan
					</Heading>
					<Pressable className="flex-row items-center gap-1">
						<Text
							className="text-base font-medium"
							style={{ color: palette.tint }}
						>
							View all
						</Text>
						<ChevronRight size={18} color={palette.tint} />
					</Pressable>
				</Box>

				<Box className="mt-4 mx-4 gap-4">
					{workouts.map((item, index) => (
						<WorkoutCard
							key={item.id}
							item={item}
							palette={palette}
							isDark={isDark}
							index={index}
						/>
					))}
				</Box>
			</ScrollView>
		</Box>
	);
}
