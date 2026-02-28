import React from "react";
import { Pressable, ScrollView } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
	ChevronRight,
	CircleOff,
	Bookmark,
	Dices,
	MedalIcon,
} from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/contexts/theme-context";
import { Image } from "react-native";
import {
	Avatar,
	AvatarFallbackText,
	AvatarImage,
} from "@/components/ui/avatar";
import { Divider } from "@/components/ui/divider";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/auth-context";
import { useTheoryOverview } from "@/features/theory/hooks";
import { useI18n } from "@/locales/i18n-provider";

type ExploreItem = {
	id: string;
	title: string;
	description: string;
	icon: React.ComponentType<{
		size?: number;
		color?: string;
		strokeWidth?: number;
	}>;
};

interface PracticeCardProps {
	title: string;
	leftLabel: string;
	rightValue: string;
	progress: number;
	image: ImageSourcePropType;
	onPress?: () => void;
}

function clamp01(value: number) {
	return Math.min(1, Math.max(0, value));
}

function PracticeCard({
	title,
	image,
	leftLabel,
	rightValue,
	progress,
	onPress,
}: PracticeCardProps) {
	return (
		<Pressable className="flex-1" onPress={onPress}>
			<Box className="flex-1 bg-card w-full shadow-soft-1 rounded-3xl px-4 py-4">
				<Box className="flex-row -mt-1 mx-auto justify-center">
					<Image className="w-[80px] h-[80px]" source={image} />
				</Box>

				<Heading className=" text-base text-center font-semibold">
					{title}
				</Heading>

				<Box className="mt-3 flex-row items-center justify-between">
					<Text className="text-[12px]">{leftLabel}</Text>
					<Text className="text-[12px] font-semibold">{rightValue}</Text>
				</Box>

				<Box className="mt-2 h-2 rounded-full bg-background overflow-hidden">
					<Box
						className="h-full rounded-full bg-teal-900"
						style={{
							width: `${clamp01(progress) * 100}%`,
						}}
					/>
				</Box>
			</Box>
		</Pressable>
	);
}

export default function ExamScreen() {
	const router = useRouter();
	const { colorMode } = useAppTheme();
	const { user } = useAuth();
	const { language, t } = useI18n();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;
	const { summary, topics, reload } = useTheoryOverview(user?.id, language);

	const completedTopics = React.useMemo(
		() => topics.filter((topic) => topic.completed).length,
		[topics],
	);
	const totalTopics = summary.totalTopics;
	const theoryProgress = totalTopics > 0 ? completedTopics / totalTopics : 0;
	const exploreItems = React.useMemo<ExploreItem[]>(
		() => [
			{
				id: "random",
				title: t("practice.explore.random.title", "Random Questions"),
				description: t(
					"practice.explore.random.description",
					"Practice mixed questions",
				),
				icon: Dices,
			},
			{
				id: "mistakes",
				title: t("practice.explore.mistakes.title", "Mistakes"),
				description: t(
					"practice.explore.mistakes.description",
					"Review questions you got wrong",
				),
				icon: CircleOff,
			},
			{
				id: "bookmarks",
				title: t("practice.explore.bookmarks.title", "Bookmarks"),
				description: t(
					"practice.explore.bookmarks.description",
					"Revisit your saved questions",
				),
				icon: Bookmark,
			},
			{
				id: "marathon",
				title: t("practice.explore.marathon.title", "Marathon"),
				description: t(
					"practice.explore.marathon.description",
					"Full-length practice session",
				),
				icon: MedalIcon,
			},
		],
		[t],
	);

	React.useEffect(() => {
		router.prefetch("/tabs/(questions)/theory");
		router.prefetch("/tabs/(questions)/bookmarks");
		router.prefetch("/tabs/(questions)/mistakes");
		router.prefetch("/tabs/(questions)/marathon");
	}, [router]);

	useFocusEffect(
		React.useCallback(() => {
			reload().catch(() => {});
		}, [reload]),
	);

	const handleExplorePress = React.useCallback(
		(itemId: string) => {
			if (itemId === "bookmarks") {
				router.navigate("/tabs/(questions)/bookmarks");
				return;
			}
			if (itemId === "mistakes") {
				router.navigate("/tabs/(questions)/mistakes");
				return;
			}
			if (itemId === "marathon") {
				router.navigate("/tabs/(questions)/marathon");
				return;
			}
		},
		[router],
	);

	return (
		<Box className="flex-1 pt-safe bg-background">
			<Box className="my-2 px-4 flex-row items-center justify-between">
				<Heading className="text-[28px] font-bold">
					{t("theory.practice", "Practice")}
				</Heading>

				<Box className="flex-row items-center gap-2">
					<Avatar className="bg-primary w-[40px] h-[40px]">
						<AvatarFallbackText>Jane Doe</AvatarFallbackText>
						<AvatarImage
							source={{
								uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
							}}
						/>
					</Avatar>
				</Box>
			</Box>

				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
				>
					<Box className="mt-4 flex-row gap-3">
						<PracticeCard
							title={t("theory.title", "Theory")}
							leftLabel={t("practice.completedShort", "Done")}
							rightValue={`${completedTopics}/${totalTopics}`}
							progress={theoryProgress}
							image={require("../../../assets/images/practice/books-ilustration.webp")}
							onPress={() => router.navigate("/tabs/(questions)/theory")}
						/>
						<PracticeCard
							title={t("practice.hazardClips", "Hazard Clips")}
							leftLabel={t("practice.clips", "Clips")}
							rightValue="18/240"
							progress={18 / 240}
							image={require("../../../assets/images/practice/movies.webp")}
						/>
					</Box>

					<Pressable onPress={() => router.navigate("/tabs/(questions)/exam")}>
						<Box className="mt-3 rounded-3xl shadow-soft-1 px-4 bg-card py-4 flex-row items-center">
							<Box className="items-center justify-center">
								<Image
									className="w-[60px] h-[60px]"
									source={require("../../../assets/images/practice/medal.webp")}
								/>
							</Box>

							<Box className="flex-1 ml-4 pr-2">
								<Heading className="text-base font-semibold">
									{t("practice.mockExam", "Mock Exam")}
								</Heading>
								<Text className="text-[12px] leading-5 mt-1">
									{t(
										"practice.mockExamDescription",
										"Test your driving knowledge and hazard perception skills",
									)}
								</Text>
							</Box>

							<ChevronRight size={24} color={palette.tabIconDefault} />
						</Box>
					</Pressable>

					<Heading className="text-base mt-4 font-semibold">
						{t("practice.moreToExplore", "More to explore")}
					</Heading>

					<Box className="mt-3 rounded-3xl shadow-soft-5 bg-card">
						{exploreItems.map((item, index) => {
							const Icon = item.icon;
							const isLast = index === exploreItems.length - 1;
							return (
								<Pressable
									key={item.id}
									onPress={() => handleExplorePress(item.id)}
								>
									<Box className="px-4 py-4 flex-row items-center">
										<Box className="h-10 w-10 bg-background shadow-soft-5 rounded-xl items-center justify-center">
											<Icon size={22} color={palette.text} />
										</Box>

										<Box className="flex-1 ml-4">
											<Heading className="text-sm font-semibold">
												{item.title}
											</Heading>
											<Text className="text-[12px] mt-1">{item.description}</Text>
										</Box>

										<ChevronRight size={22} color={palette.text} />
									</Box>
									{!isLast ? <Divider className="mx-4" /> : null}
								</Pressable>
							);
						})}
					</Box>
				</ScrollView>
		</Box>
	);
}
