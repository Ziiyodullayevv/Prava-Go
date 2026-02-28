import React, { useMemo, useRef } from "react";
import { Pressable, ScrollView, type DimensionValue } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	Accordion,
	AccordionContent,
	AccordionHeader,
	AccordionItem,
	AccordionTitleText,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Box } from "@/components/ui/box";
import {
	BottomSheet,
	BottomSheetBackdrop,
	type BottomSheetController,
	BottomSheetContent,
	BottomSheetDragIndicator,
	BottomSheetPortal,
	BottomSheetScrollView,
} from "@/components/ui/bottomsheet";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import { useTheoryOverview, useTheorySession } from "@/features/theory/hooks";
import { useI18n } from "@/locales/i18n-provider";

function clamp(n: number, min: number, max: number) {
	return Math.min(max, Math.max(min, n));
}

export default function TheoryResultScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { colorMode } = useAppTheme();
	const { user } = useAuth();
	const { language, t } = useI18n();
	const { topics } = useTheoryOverview(user?.id, language);
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;

	const params = useLocalSearchParams<{
		slug?: string;
		title?: string;
		topicId?: string;
		sessionId?: string;
		correct?: string;
		total?: string;
		answered?: string;
		passMark?: string;
		reason?: string;
	}>();

	const total = Math.max(1, Number(params.total ?? 1));
	const correct = clamp(Number(params.correct ?? 0), 0, total);
	const answered = clamp(Number(params.answered ?? 0), 0, total);
	const passMark = clamp(Number(params.passMark ?? 80), 0, 100);
	const currentSlug = params.slug ?? "road-and-traffic-signs";
	const sessionId =
		typeof params.sessionId === "string" ? params.sessionId : "";
	const percent = Math.round((correct / total) * 100);
	const passed = percent >= passMark;
	const isTimeout = params.reason === "timeout";
	const isMistakeLimit = params.reason === "mistake_limit";
	const topicTitle = params.title ?? t("theory.title", "Theory");
	const reviewSheetRef = useRef<BottomSheetController | null>(null);
	const { session: reviewSession, isLoading: reviewLoading } = useTheorySession(
		user?.id,
		sessionId,
		language,
	);
	const isMockResult =
		reviewSession?.mode === "mock_exam" || currentSlug === "mock-exam";
	const isMarathonResult =
		reviewSession?.mode === "marathon" || currentSlug === "marathon";
	const isMistakesResult =
		reviewSession?.mode === "mistakes_practice" || currentSlug === "mistakes";
	const isExamStyleResult = isMockResult || isMarathonResult || isMistakesResult;

	const passMarkOffset = useMemo<DimensionValue>(
		() => `${passMark}%`,
		[passMark],
	);
	const scoreWidth = useMemo<DimensionValue>(
		() => `${clamp(percent, 0, 100)}%`,
		[percent],
	);
	const nextTopic = useMemo(() => {
		if (topics.length === 0) {
			return {
				slug: currentSlug,
				title: topicTitle,
			};
		}

		const currentIndex = topics.findIndex(
			(topic) => topic.slug === currentSlug,
		);
		if (currentIndex === -1) {
			return {
				slug: topics[0].slug,
				title: topics[0].title,
			};
		}

		const nextIndex = (currentIndex + 1) % topics.length;
		return {
			slug: topics[nextIndex].slug,
			title: topics[nextIndex].title,
		};
	}, [currentSlug, topicTitle, topics]);
	const reviewQuestions = useMemo(
		() =>
			[...(reviewSession?.questions ?? [])].sort(
				(a, b) => a.position - b.position,
			),
		[reviewSession?.questions],
	);

	const restartCurrentTopic = () => {
		router.back();
	};

	const reviewAnswers = () => {
		reviewSheetRef.current?.open();
	};

	const goToNextTopic = () => {
		if (isMockResult) {
			router.replace("/tabs/(questions)/exam");
			return;
		}
		if (isMarathonResult) {
			router.replace("/tabs/(questions)/marathon");
			return;
		}
		if (isMistakesResult) {
			router.replace("/tabs/(questions)/mistakes");
			return;
		}

		router.replace({
			pathname: "/tabs/(questions)/theory/[slug]",
			params: {
				slug: nextTopic.slug,
				title: nextTopic.title,
			},
		});
	};

	const statusImage = isExamStyleResult
		? passed
			? require("../../../../../assets/images/status/status-success-2.png")
			: require("../../../../../assets/images/status/status-mistake-2.png")
		: passed
			? require("../../../../../assets/images/status/status-success-1.webp")
			: require("../../../../../assets/images/status/status-mistake-1.avif");

	return (
		<BottomSheet ref={reviewSheetRef} snapToIndex={0}>
			<Box className="flex-1 bg-background pt-safe">
				<Box className="px-4 my-2 flex-row items-center justify-between">
					<Pressable onPress={() => router.replace("/tabs/(tabs)/practice")}>
						<Box className="h-12 w-12 rounded-full items-center shadow-hard-5 justify-center bg-card">
							<ChevronLeft size={24} color={palette.text} />
						</Box>
					</Pressable>

					<Heading className="text-lg font-semibold">
						{t("common.results", "Results")}
					</Heading>

					<Pressable onPress={restartCurrentTopic}>
						<Box className="h-12 w-12 rounded-full items-center shadow-hard-5 justify-center bg-card">
							<RotateCcw size={24} color={palette.text} />
						</Box>
					</Pressable>
				</Box>

				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{
						paddingHorizontal: 16,
						paddingBottom: Math.max(insets.bottom, 12) + 96,
					}}
				>
					<Box className="items-center mt-3">
						<Image
							className="h-[210px] w-[210px]"
							source={statusImage}
							alt="result"
							resizeMode="contain"
						/>

						<Heading className="mt-4 text-3xl font-semibold">
							{passed
								? t("theory.result.passedTitle", "Test passed!")
								: t("theory.result.failedTitle", "Test failed")}
						</Heading>

						<Text className="mt-2 text-base text-center text-muted-foreground px-10">
							{passed
								? t(
										"theory.result.passedDescription",
										"You've passed this test and unlocked your next learning step",
									)
								: isMistakeLimit
									? t(
											"theory.result.mistakeLimitDescription",
											"You reached 3 incorrect answers. The test ended automatically.",
										)
									: isTimeout
										? t(
												"theory.result.timeoutDescription",
												"Time is over. Review your answers and try again.",
											)
										: t(
												"theory.result.failedDescription",
												"You did not reach the pass mark. Review and retry.",
											)}
						</Text>
					</Box>

					<Box className="mt-9">
						<Heading className="text-center text-3xl font-semibold">
							{percent}%
						</Heading>

						<Box className="mt-4 px-1">
							<Box className="flex-row items-center justify-between">
								<Text className="text-sm text-muted-foreground">0</Text>
								<Text className="text-sm text-muted-foreground">100</Text>
							</Box>

							<Box className="mt-2 relative">
								<Box className="p-1.5 bg-foreground/10 rounded-full">
									<Box className="h-2 rounded-full bg-white overflow-hidden">
										<Box
											className={[
												"h-full rounded-full",
												passed ? "bg-brand" : "bg-destructive",
											].join(" ")}
											style={{ width: scoreWidth }}
										/>
									</Box>
								</Box>

								<Box
									className="absolute -top-0 h-5 w-[2px] bg-foreground"
									style={{ left: passMarkOffset }}
								/>
							</Box>

							<Text className="mt-4 text-center text-base text-muted-foreground">
								{t("common.practicePassMark", "PRACTICE PASS MARK")}: {passMark}
								%
							</Text>

							{/* <Text className="mt-1 text-center text-sm text-muted-foreground">
								Correct: {correct}/{total} | Answered: {answered}/{total}
							</Text> */}
						</Box>
					</Box>
				</ScrollView>

				<Box
					className="absolute left-0 right-0 bottom-0 px-4 pt-3 bg-background border-t border-border/30"
					style={{ paddingBottom: Math.max(insets.bottom, 12) }}
				>
					<Box className="flex-row items-center gap-3">
						<Button
							className="flex-1 h-14 rounded-2xl bg-card border border-border"
							onPress={reviewAnswers}
						>
							<ButtonText className="text-base font-semibold text-foreground">
								{t("common.reviewAnswers", "Review answers")}
							</ButtonText>
						</Button>

						<Button
							className="flex-1 h-14 rounded-2xl bg-primary"
							onPress={goToNextTopic}
						>
							<ButtonText className="text-base font-semibold text-primary-foreground">
								{t("common.nextTest", "Next test")}
							</ButtonText>
						</Button>
					</Box>
				</Box>

				<BottomSheetPortal
					backgroundStyle={{
						borderTopLeftRadius: 30,
						borderTopRightRadius: 30,
						opacity: 0,
					}}
					snapPoints={["72%", "100%"]}
					enableDynamicSizing={false}
					enableHandlePanningGesture
					enableContentPanningGesture
					enableOverDrag={false}
					topInset={insets.top}
					backdropComponent={(props) => (
						<BottomSheetBackdrop
							{...props}
							appearsOnIndex={0}
							disappearsOnIndex={-1}
						/>
					)}
					handleComponent={(props) => (
						<BottomSheetDragIndicator
							{...props}
							className="rounded-t-[30px] bg-card border-b border-border"
						>
							<Text className="text-lg mt-4 font-medium">
								{t("common.reviewAnswers", "Review answers")}
							</Text>
						</BottomSheetDragIndicator>
					)}
				>
					<BottomSheetContent className=" pb-0 bg-card h-full">
						<BottomSheetScrollView
							showsVerticalScrollIndicator={false}
							contentContainerStyle={{
								paddingBottom: Math.max(insets.bottom, 20),
							}}
						>
							{reviewLoading ? (
								<Text className="mt-1 text-sm text-muted-foreground">
									{t("common.loading", "Loading...")}
								</Text>
							) : reviewQuestions.length === 0 ? (
								<Text className="mt-1 text-sm text-muted-foreground">
									{t("theory.review.empty", "Javoblar ro'yxati topilmadi.")}
								</Text>
							) : (
								<Accordion
									type="single"
									isCollapsible
									isDisabled={false}
									className="w-full"
								>
									{reviewQuestions.map((question, questionIndex) => {
										const selectedOptionIndex = question.options.findIndex(
											(option) => option.id === question.selectedOptionId,
										);
										const answerSummary =
											selectedOptionIndex >= 0
												? `${t("common.answered", "Answered")}: F${selectedOptionIndex + 1}`
												: t(
														"theory.alert.unansweredMessagePrefix",
														"Hali javob berilmagan savol:",
													).replace(/:\s*$/, "");

										return (
											<AccordionItem
												key={question.sessionQuestionId}
												value={question.sessionQuestionId}
												className="mt-3 rounded-3xl mx-4 bg-background px-3 shadow-md/20"
											>
												<AccordionHeader className="py-3">
													<AccordionTrigger className="gap-0">
														<Box className="flex-row items-start">
															<Box className="h-[40px] w-[40px] rounded-full bg-card items-center justify-center">
																<Text className="text-sm font-semibold text-foreground">
																	{questionIndex + 1}
																</Text>
															</Box>

															<Box className="ml-2 flex-1">
																<AccordionTitleText className="text-base font-semibold leading-6 text-foreground">
																	{question.prompt}
																</AccordionTitleText>
															
																<Text className="mt-2 text-sm text-muted-foreground">
																	{answerSummary}
																</Text>
															</Box>

															<Box className="ml-2 mt-1">
																<ChevronRight
																	size={22}
																	color={palette.tabIconDefault}
																/>
															</Box>
														</Box>
													</AccordionTrigger>
												</AccordionHeader>
												<AccordionContent className="pt-1 pb-4">
													{question.imageUrl ? (
														<Box className="rounded-2xl overflow-hidden border border-border/40 bg-card">
															<Image
																source={{ uri: question.imageUrl }}
																alt={question.prompt}
																className="w-full h-[190px]"
																resizeMode="contain"
															/>
														</Box>
													) : null}

													<Box className="mt-3 gap-2">
														{question.options.map((option, optionIndex) => {
															const isSelected =
																question.selectedOptionId === option.id;
															const isWrongSelection =
																isSelected && !option.isCorrect;
															const isCorrectSelection =
																isSelected && option.isCorrect;
															const isMissedCorrect =
																Boolean(question.selectedOptionId) &&
																question.isCorrect === false &&
																option.isCorrect;

															return (
																<Box
																	key={option.id}
																	className={[
																		"rounded-2xl border px-3 py-3",
																		isWrongSelection
																			? "border-destructive bg-destructive/10"
																			: isCorrectSelection
																				? "border-brand bg-brand/15"
																				: isMissedCorrect
																					? "border-brand/60 bg-brand/5"
																					: "border-border bg-card",
																	].join(" ")}
																>
																	<Text className="text-sm font-medium text-foreground">
																		{`F${optionIndex + 1}. ${option.text}`}
																	</Text>
																	{isSelected ? (
																		<Text className="mt-1 text-xs text-muted-foreground">
																			{t(
																				"theory.review.yourAnswer",
																				"Sizning javobingiz",
																			)}
																		</Text>
																	) : null}
																	{isMissedCorrect ? (
																		<Text className="mt-1 text-xs text-brand">
																			{t(
																				"theory.review.correctAnswer",
																				"To'g'ri javob",
																			)}
																		</Text>
																	) : null}
																</Box>
															);
														})}
													</Box>
												</AccordionContent>
											</AccordionItem>
										);
									})}
								</Accordion>
							)}
						</BottomSheetScrollView>
					</BottomSheetContent>
				</BottomSheetPortal>
			</Box>
		</BottomSheet>
	);
}
