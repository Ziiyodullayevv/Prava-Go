import React, { useMemo } from "react";
import { Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import { Colors } from "@/constants/Colors";
import {
	ProgressRing,
	StatsCardsRow,
	TopicCard,
} from "@/features/theory/components";
import { useTheoryOverview } from "@/features/theory/hooks";
import { getTopicIcon } from "@/features/theory/ui-mappers";
import { useI18n } from "@/locales/i18n-provider";

function formatCount(value: number) {
	return value.toLocaleString("en-US");
}

function TopicCardSkeleton() {
	return (
		<Box className="gap-4 p-4 rounded-3xl bg-card shadow-hard-5">
			<Skeleton variant="sharp" className="h-[84px] rounded-xl" />
			<SkeletonText _lines={2} className="h-3" />
			<HStack className="gap-2 items-center">
				<Skeleton variant="circular" className="h-5 w-5" />
				<SkeletonText _lines={1} gap={1} className="h-3 w-2/5" />
			</HStack>
		</Box>
	);
}

function buildProgressLabel(
	topic: {
		completed: boolean;
		seenQuestions: number;
		totalQuestions: number;
	},
	t: (key: string, fallback?: string) => string,
) {
	if (topic.completed) return t("theory.completed", "Completed");
	return `${topic.seenQuestions}/${topic.totalQuestions} ${t("common.questionsWord", "questions")}`;
}

export default function TheoryScreen() {
	const router = useRouter();
	const { user } = useAuth();
	const { colorMode } = useAppTheme();
	const { language, t } = useI18n();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;
	const text = isDark ? "#ECEDEE" : "#111111";
	const muted = isDark ? "#b0b0b0" : "#4b4b4b";
	const divider = isDark ? "#3f3f3f" : "#e7e7e7";

	const { summary, topics, isLoading, error, reload } = useTheoryOverview(
		user?.id,
		language,
	);

	const stats = useMemo(
		() => [
			{ label: t("theory.topics", "Topics"), value: formatCount(summary.totalTopics) },
			{
				label: t("theory.questions", "Questions"),
				value: formatCount(summary.totalQuestions),
			},
			{ label: t("theory.seen", "Seen"), value: formatCount(summary.seenQuestions) },
			{
				label: t("theory.notSeen", "Not Seen"),
				value: formatCount(summary.notSeenQuestions),
			},
		],
		[
			t,
			summary.notSeenQuestions,
			summary.seenQuestions,
			summary.totalQuestions,
			summary.totalTopics,
		],
	);

	return (
		<Box className="flex-1 pt-safe bg-background">
			<Box className="px-4 my-2 flex-row items-center justify-between">
				<Pressable onPress={() => router.back()}>
					<Box className="h-12 w-12 rounded-full items-center shadow-hard-5 justify-center bg-card">
						<ChevronLeft size={24} color={palette.text} />
					</Box>
				</Pressable>

				<Heading className="text-lg font-semibold" style={{ color: text }}>
					{t("theory.title", "Theory")}
				</Heading>

				<ProgressRing progress={summary.progressPercent} progressColor="#0f8b5f" />
			</Box>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
			>
				<StatsCardsRow className="mt-4" items={stats} />

				{error ? (
					<Box className="mt-3 rounded-2xl bg-card px-3 py-3 border border-destructive/30">
						<Text className="text-xs text-destructive">{error}</Text>
						<Pressable className="mt-2" onPress={() => reload()}>
							<Text className="text-sm font-semibold text-primary">
								{t("common.retry", "Retry")}
							</Text>
						</Pressable>
					</Box>
				) : null}

				<Box className="mt-3 gap-3">
					{isLoading && topics.length === 0 ? (
						<>
							<TopicCardSkeleton />
							<TopicCardSkeleton />
							<TopicCardSkeleton />
						</>
					) : topics.length === 0 ? (
						<Box className="rounded-3xl bg-card shadow-hard-5 px-4 py-5">
							<Text className="text-sm text-foreground/70">
								{t("theory.empty", "No topics found.")}
							</Text>
						</Box>
					) : (
						topics.map((topic) => (
							<TopicCard
								key={topic.id}
								title={topic.title}
								subtitle={topic.subtitle || t("theory.sectionSubtitle", "Theory section")}
								progressLabel={buildProgressLabel(topic, t)}
								completed={topic.completed}
								icon={getTopicIcon(topic.slug)}
								textColor={text}
								mutedColor={muted}
								onPress={() =>
									router.push({
										pathname: "/tabs/(questions)/theory/[slug]",
										params: { slug: topic.slug },
									})
								}
							/>
						))
					)}
				</Box>

				<Box
					className="h-4"
					style={{ borderBottomWidth: 1, borderBottomColor: divider }}
				/>
			</ScrollView>
		</Box>
	);
}
