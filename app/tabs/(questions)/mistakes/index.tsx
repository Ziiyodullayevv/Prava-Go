import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ChevronLeft, CircleOff } from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import { Colors } from "@/constants/Colors";
import { StatsCardsRow, TopicCard } from "@/features/theory/components";
import { loadMistakeQuestionPacks } from "@/features/theory/api";
import type { MistakeQuestionPack } from "@/features/theory/types";
import { useI18n } from "@/locales/i18n-provider";

function formatCount(value: number) {
	return value.toLocaleString("en-US");
}

export default function MistakesScreen() {
	const router = useRouter();
	const { user } = useAuth();
	const { colorMode } = useAppTheme();
	const { t } = useI18n();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;
	const text = isDark ? "#ECEDEE" : "#111111";
	const muted = isDark ? "#b0b0b0" : "#4b4b4b";
	const [packs, setPacks] = useState<MistakeQuestionPack[]>([]);
	const [totalWrongQuestions, setTotalWrongQuestions] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	const reload = useCallback(async () => {
		if (!user?.id) {
			setPacks([]);
			setTotalWrongQuestions(0);
			setError("");
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			const data = await loadMistakeQuestionPacks(user.id);
			setPacks(data.packs);
			setTotalWrongQuestions(data.totalWrongQuestions);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: t("common.error", "Something went wrong.");
			setError(message);
			setPacks([]);
			setTotalWrongQuestions(0);
		} finally {
			setIsLoading(false);
		}
	}, [t, user?.id]);

	useFocusEffect(
		useCallback(() => {
			reload().catch(() => {});
		}, [reload]),
	);

	const stats = useMemo(
		() => [
			{
				label: t("practice.mistakes.packs", "Sections"),
				value: formatCount(packs.length),
			},
			{
				label: t("practice.mistakes.totalWrong", "Wrong questions"),
				value: formatCount(totalWrongQuestions),
			},
		],
		[packs.length, t, totalWrongQuestions],
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
					{t("practice.explore.mistakes.title", "Mistakes")}
				</Heading>

				<Box className="h-12 w-12 rounded-full bg-card items-center justify-center shadow-hard-5">
					<CircleOff size={22} color={palette.text} />
				</Box>
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
					{isLoading ? (
						<Box className="rounded-3xl bg-card shadow-hard-5 px-4 py-5">
							<Text className="text-sm text-foreground/70">
								{t("common.loading", "Loading...")}
							</Text>
						</Box>
					) : packs.length === 0 ? (
						<Box className="rounded-3xl bg-card shadow-hard-5 px-4 py-5">
							<Text className="text-sm text-foreground/70">
								{t(
									"practice.mistakes.empty",
									"Hozircha xato topilgan savollar yo'q.",
								)}
							</Text>
						</Box>
					) : (
						packs.map((pack, index) => (
							<TopicCard
								key={pack.id}
								title={t(
									"practice.mistakes.packTitle",
									"Xatolar to'plami",
								)}
								subtitle={`${t("practice.mistakes.packNumber", "Bo'lim")} ${index + 1}`}
								progressLabel={`${pack.totalQuestions} ${t("common.questionsWord", "savol")}`}
								completed={false}
								icon={CircleOff}
								textColor={text}
								mutedColor={muted}
								onPress={() =>
									router.push({
										pathname: "/tabs/(questions)/mistakes/[packId]",
										params: { packId: pack.id },
									})
								}
							/>
						))
					)}
				</Box>
			</ScrollView>
		</Box>
	);
}
