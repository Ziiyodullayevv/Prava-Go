import React, { useCallback, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
	ChevronLeft,
	ChevronRight,
	CircleCheck,
	CircleHelp,
	CircleX,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Image } from "@/components/ui/image";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@/components/ui/modal";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import { ProgressRing, ToggleRow } from "@/features/theory/components";
import {
	useTheoryTopicDetail,
	useTheoryTestSettings,
} from "@/features/theory/hooks";
import {
	completeTheorySession,
	createTheorySession,
	loadTopicQuestionBank,
	type TopicQuestionBank,
} from "@/features/theory/api";
import { flushSessionCompletionQueue } from "@/features/theory/offline-queue";
import { getTopicIllustration } from "@/features/theory/ui-mappers";
import type { TheorySession } from "@/features/theory/types";
import {
	getTheorySessionLangCacheKey,
	getTheoryTopicQuestionBankLangCacheKey,
	peekMemoryCache,
	writeCache,
} from "@/features/theory/cache";
import { useI18n } from "@/locales/i18n-provider";
import { Icon } from "@/components/ui/icon";

type StatItemProps = {
	label: string;
	value: number;
	icon: React.ComponentType<{
		size?: number;
		color?: string;
		strokeWidth?: number;
	}>;
	className: string;
};

function StatItem({ label, value, icon, className }: StatItemProps) {
	const StatIcon = icon;

	return (
		<Box className="flex-1">
			<Box className="flex-row items-center gap-2">
				<Icon className={[className].join(" ")} as={StatIcon} size={"sm"} />
				<Text
					className={["text-sm text-muted-foreground", className].join(" ")}
				>
					{label}
				</Text>
			</Box>
			<Heading className="mt-1 text-3xl font-semibold">{value}</Heading>
		</Box>
	);
}

export default function TheoryTopicDetailsScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { colorMode } = useAppTheme();
	const { user } = useAuth();
	const { language, t } = useI18n();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;
	const text = isDark ? "#ECEDEE" : "#111111";
	const muted = isDark ? "#b0b0b0" : "#4b4b4b";
	const primaryForegroundColor = isDark ? "#171717" : "#FAFAFA";
	const [startLoading, setStartLoading] = useState(false);
	const [startError, setStartError] = useState("");
	const [isNoMistakesModalOpen, setIsNoMistakesModalOpen] = useState(false);

	const params = useLocalSearchParams<{ slug?: string }>();
	const slug = typeof params.slug === "string" ? params.slug : "";

	const { detail, isLoading, error, reload } = useTheoryTopicDetail(
		user?.id,
		slug,
		language,
	);
	const {
		settings,
		isReady,
		setShowMistakesOnly,
		setShuffleQuestions,
		setAutoAdvance,
	} = useTheoryTestSettings();

	const topic = detail?.topic ?? null;
	const topicTitle = topic?.title ?? t("theory.title", "Theory");
	const topicDescription =
		topic?.subtitle || t("theory.sectionSubtitle", "Theory section");
	const progressPercent = topic?.progressPercent ?? 0;

	const syncPendingCompletions = useCallback(async () => {
		if (!user?.id) return;
		await flushSessionCompletionQueue(user.id, async (item) => {
			await completeTheorySession({
				userId: item.userId,
				sessionId: item.sessionId,
				answers: item.answers,
			});
		});
	}, [user?.id]);

	useFocusEffect(
		useCallback(() => {
			let isCancelled = false;

			const refreshOnFocus = async () => {
				if (!user?.id || !slug) return;
				void syncPendingCompletions().catch(() => {});

				if (isCancelled) return;
				await reload();
			};

			refreshOnFocus().catch(() => {});

			return () => {
				isCancelled = true;
			};
		}, [reload, slug, syncPendingCompletions, user?.id]),
	);

	const handleStartTest = async () => {
		if (!user?.id || !topic || startLoading) return;

		setStartError("");
		setIsNoMistakesModalOpen(false);
		setStartLoading(true);
		try {
			const topicBankKey = getTheoryTopicQuestionBankLangCacheKey(
				topic.id,
				language,
			);
			const memoryBank = peekMemoryCache<TopicQuestionBank>(topicBankKey);

			let topicBank: TopicQuestionBank;
			let sessionResult: Awaited<ReturnType<typeof createTheorySession>>;

			if (memoryBank && memoryBank.questions.length > 0) {
				topicBank = memoryBank;
				sessionResult = await createTheorySession({
					userId: user.id,
					topicId: topic.id,
					mode: "topic_practice",
					settings,
					availableQuestionIds: topicBank.questions.map(
						(item) => item.questionId,
					),
				});
				void loadTopicQuestionBank(topic.id).catch(() => {});
			} else {
				const [loadedBank, createdSession] = await Promise.all([
					loadTopicQuestionBank(topic.id),
					createTheorySession({
						userId: user.id,
						topicId: topic.id,
						mode: "topic_practice",
						settings,
					}),
				]);
				topicBank = loadedBank;
				sessionResult = createdSession;
			}

			const { sessionId, startedAt, sessionQuestions } = sessionResult;

			const bankByQuestionId = new Map(
				topicBank.questions.map((item) => [item.questionId, item]),
			);
			const preparedQuestions = sessionQuestions
				.map((item) => {
					const cachedQuestion = bankByQuestionId.get(item.questionId);
					if (!cachedQuestion) return null;
					return {
						sessionQuestionId: item.id,
						questionId: item.questionId,
						position: item.position,
						prompt: cachedQuestion.prompt,
						imageUrl: cachedQuestion.imageUrl,
						explanation: cachedQuestion.explanation,
						options: cachedQuestion.options,
						selectedOptionId: null,
						isCorrect: null,
						answeredAt: null,
					};
				})
				.filter(Boolean) as TheorySession["questions"];

			if (preparedQuestions.length === sessionQuestions.length) {
				const preparedSession: TheorySession = {
					id: sessionId,
					userId: user.id,
					topicId: topic.id,
					topicSlug: topic.slug,
					topicTitle: topic.title,
					mode: "topic_practice",
					totalQuestions: preparedQuestions.length,
					settings,
					startedAt,
					finishedAt: null,
					scoreCorrect: 0,
					scoreIncorrect: 0,
					questions: preparedQuestions,
				};
				void writeCache(
					getTheorySessionLangCacheKey(user.id, sessionId, language),
					preparedSession,
				).catch(() => {});
			}

			router.push({
				pathname: "/tabs/(questions)/theory/test/[sessionId]",
				params: { sessionId },
			});
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Testni boshlashda xatolik yuz berdi.";
			const isNoMistakesOnlyError =
				settings.showMistakesOnly &&
				message.includes("Noto'g'ri ishlangan savollar topilmadi.");

			if (isNoMistakesOnlyError) {
				setStartError("");
				setIsNoMistakesModalOpen(true);
			} else {
				setStartError(message);
			}
		} finally {
			setStartLoading(false);
		}
	};

	return (
		<Box className="flex-1 pt-safe bg-background">
			<Box className="px-4 my-2 flex-row items-center justify-between">
				<Pressable onPress={() => router.back()}>
					<Box className="h-12 w-12 rounded-full items-center shadow-hard-5 justify-center bg-card">
						<ChevronLeft size={24} color={palette.text} />
					</Box>
				</Pressable>

				<Box className="items-center">
					<Heading className="text-lg font-semibold" style={{ color: text }}>
						{t("theory.practice", "Practice")}
					</Heading>
					<Text className="text-sm" style={{ color: muted }}>
						{t("theory.testOptions", "Test options")}
					</Text>
				</Box>

				<ProgressRing progress={progressPercent} />
			</Box>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					paddingBottom: Math.max(insets.bottom, 12) + 112,
				}}
			>
				<Box className="pt-1">
					<Image
						className="self-center mt-4 w-[230px] h-[150px]"
						source={getTopicIllustration(topic?.imageKey)}
						alt={topicTitle}
						resizeMode="contain"
					/>

					<Heading
						numberOfLines={2}
						ellipsizeMode="tail"
						className="mt-1 text-center px-5 text-2xl font-semibold"
						style={{ color: text }}
					>
						{topicTitle}
					</Heading>

					<Box className="mt-2 self-center flex-row items-center">
						<Text className="text-base" style={{ color: muted }}>
							{topicDescription}
						</Text>
						<Box className="ml-1">
							<ChevronRight
								size={18}
								strokeWidth={2}
								color={palette.tabIconDefault}
							/>
						</Box>
					</Box>
				</Box>

				{error ? (
					<Box className="px-4 mt-4">
						<Box className="rounded-2xl bg-card px-3 py-3 border border-destructive/30">
							<Text className="text-xs text-destructive">{error}</Text>
							<Pressable className="mt-2" onPress={() => reload()}>
								<Text className="text-sm font-semibold text-primary">
									{t("common.retry", "Retry")}
								</Text>
							</Pressable>
						</Box>
					</Box>
				) : null}

				<Box className="mt-6 rounded-t-[34px] h-full bg-card px-4 pt-5 pb-7">
					<Text className="text-sm uppercase tracking-wide text-muted-foreground">
						{t("theory.statsTitle", "Your answer stats")}
					</Text>

					<Box className="rounded-2xl py-4">
						<Box className="flex-row items-center">
							<StatItem
								className="text-blue-700"
								label={t("theory.questions", "Questions")}
								value={topic?.totalQuestions ?? 0}
								icon={CircleHelp}
							/>
							<Box className="mx-2 h-16 w-[1px] bg-border/70" />
							<StatItem
								className="text-green-700"
								label={t("theory.correct", "Correct")}
								value={topic?.correctCount ?? 0}
								icon={CircleCheck}
							/>
							<Box className="mx-2 h-16 w-[1px] bg-border/70" />
							<StatItem
								label={t("theory.incorrect", "Incorrect")}
								value={topic?.incorrectCount ?? 0}
								icon={CircleX}
								className="text-red-700"
							/>
						</Box>
					</Box>

					<Text className="text-sm uppercase tracking-wide text-muted-foreground">
						{t("theory.additionalSettings", "Additional settings")}
					</Text>

					<Box className="mt-3 rounded-3xl bg-background px-4">
						<ToggleRow
							label={t(
								"theory.settings.mistakesOnly",
								"Show only mistaken questions",
							)}
							value={settings.showMistakesOnly}
							onValueChange={setShowMistakesOnly}
						/>
						<ToggleRow
							label={t("theory.settings.shuffleQuestions", "Shuffle questions")}
							value={settings.shuffleQuestions}
							onValueChange={setShuffleQuestions}
						/>
						{isReady ? (
							<ToggleRow
								label={t(
									"theory.settings.autoAdvance",
									"Auto-advance to next question",
								)}
								value={settings.autoAdvance}
								onValueChange={setAutoAdvance}
							/>
						) : (
							<Box className="h-14 flex-row items-center justify-between border-b border-foreground/10">
								<Text className="text-base font-normal text-muted-foreground">
									{t("theory.settings.loading", "Settings are loading...")}
								</Text>
							</Box>
						)}
					</Box>

					{startError ? (
						<Text className="mt-3 text-sm text-destructive">{startError}</Text>
					) : null}
				</Box>
			</ScrollView>

			<Box
				className="absolute left-0 right-0 bottom-0 px-4 pt-3 bg-card border-t border-border/40"
				style={{ paddingBottom: Math.max(insets.bottom, 12) }}
			>
				<Button
					className="h-14 rounded-2xl bg-primary"
					onPress={handleStartTest}
					disabled={isLoading || !topic || startLoading}
				>
					{startLoading ? (
						<ButtonSpinner color={primaryForegroundColor} />
					) : null}
					<ButtonText className="text-base font-semibold text-primary-foreground">
						{startLoading
							? t("common.starting", "Starting...")
							: t("theory.startTest", "Start test")}
					</ButtonText>
				</Button>
			</Box>

			<Modal
				isOpen={isNoMistakesModalOpen}
				onClose={() => setIsNoMistakesModalOpen(false)}
				size="lg"
			>
				<ModalBackdrop className="bg-foreground/20 !backdrop-blur-2xl" />
				<ModalContent className="rounded-[30px] bg-background p-5">
					<ModalHeader />
					<ModalBody className="mt-3 text-center mb-5">
						<Image
							className="mx-auto"
							source={require("../../../../assets/images/alert.webp")}
							alt=""
						/>
						<Divider className="mx-4 my-4" />
						<Heading className="text-center" size="md">
							{t("theory.mistakesOnly.emptyTitle", "Diqqat")}
						</Heading>

						<Text className="text-base text-center mt-1 text-muted-foreground">
							{t(
								"theory.mistakesOnly.emptyMessage",
								"Hozircha xato qilingan savollar topilmadi. Avval oddiy test ishlang.",
							)}
						</Text>
					</ModalBody>
					<ModalFooter className="justify-center">
						<Button
							size="lg"
							className="rounded-full px-10"
							onPress={() => setIsNoMistakesModalOpen(false)}
						>
							<ButtonText>{t("common.understood", "Tushundim")}</ButtonText>
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</Box>
	);
}
