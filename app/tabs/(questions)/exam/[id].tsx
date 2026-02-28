import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Alert,
	Animated,
	Dimensions,
	Easing,
	Pressable,
	ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Colors } from "@/constants/Colors";
import { useQuestionStore } from "../question-context";
import { useAppTheme } from "@/contexts/theme-context";
import { useAutoAdvance } from "@/hooks/useAutoAdvance";
import type { LocalizedQuestionItem } from "@/features/questions/localized-questions";
import { useI18n } from "@/locales/i18n-provider";

function clamp(n: number, min: number, max: number) {
	return Math.min(max, Math.max(min, n));
}

function formatClock(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getWrongCount(
	answers: Record<number, number>,
	questions: LocalizedQuestionItem[],
) {
	return questions.reduce((acc, question) => {
		const selected = answers[question.id];
		if (selected === undefined) return acc;
		if (selected !== question.correctIndex) return acc + 1;
		return acc;
	}, 0);
}

const EXAM_SECONDS = 25 * 60;
const ALLOWED_WRONG = 2;
const STOP_AT_WRONG = ALLOWED_WRONG + 1;
const SWIPE_DURATION_MS = 250;
const SWIPE_PHASE_MS = SWIPE_DURATION_MS / 2;
const SWIPE_EASING = Easing.bezier(0.42, 0, 0.58, 1);
const ANSWER_FEEDBACK_MS = 380;

export default function QuestionDetailsScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{
		id?: string;
		start?: string;
		auto?: string;
	}>();
	const { colorMode } = useAppTheme();
	const { t } = useI18n();
	const isDark = colorMode === "dark";
	const insets = useSafeAreaInsets();
	const iconColor = isDark ? Colors.dark.text : Colors.light.text;
	const { value: persistedAutoAdvance } = useAutoAdvance("mock-exam");
	const routeAutoAdvance = useMemo(() => {
		if (params.auto === "1") return true;
		if (params.auto === "0") return false;
		return null;
	}, [params.auto]);
	const autoAdvanceEnabled = routeAutoAdvance ?? persistedAutoAdvance;
	const {
		questions,
		answers,
		setAnswer,
		total,
		startExam,
		finishExam,
		startedAt,
		finishReason,
		answeredCount,
		wrongCount,
	} = useQuestionStore();
	const [nowMs, setNowMs] = useState(Date.now());
	const startedFromParamRef = useRef(false);
	const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cardTranslateX = useRef(new Animated.Value(0)).current;
	const questionViewportWidthRef = useRef(
		Math.max(320, Dimensions.get("window").width - 40),
	);
	const isCardAnimatingRef = useRef(false);

	const initialIndex = useMemo(() => {
		const parsed = Number(params.id);
		if (!Number.isFinite(parsed)) return 1;
		return clamp(parsed, 1, total);
	}, [params.id, total]);
	const [currentIndex, setCurrentIndex] = useState(initialIndex);
	const currentIndexRef = useRef(initialIndex);
	const pendingIndexRef = useRef<number | null>(null);
	const animatingToIndexRef = useRef<number | null>(null);
	const triggerScrollRef = useRef<ScrollView | null>(null);
	const triggerLayoutsRef = useRef<
		Record<number, { x: number; width: number }>
	>({});
	const triggerViewportWidthRef = useRef(0);
	const triggerContentWidthRef = useRef(0);
	const triggerScrollXRef = useRef(0);

	const questionData = questions[currentIndex - 1];
	const elapsedSeconds = startedAt ? Math.floor((nowMs - startedAt) / 1000) : 0;
	const secondsLeft = Math.max(0, EXAM_SECONDS - elapsedSeconds);

	useEffect(() => {
		if (params.start !== "1") {
			startedFromParamRef.current = false;
			return;
		}
		if (startedFromParamRef.current) return;
		startedFromParamRef.current = true;
		startExam();
	}, [params.start, startExam]);

	useEffect(() => {
		if (params.start === "1") {
			setCurrentIndex(1);
			currentIndexRef.current = 1;
			pendingIndexRef.current = null;
			return;
		}
		setCurrentIndex(initialIndex);
		currentIndexRef.current = initialIndex;
		pendingIndexRef.current = null;
	}, [initialIndex, params.start]);

	useEffect(() => {
		currentIndexRef.current = currentIndex;
	}, [currentIndex]);

	useEffect(() => {
		if (params.start === "1") return;
		if (startedAt) return;
		router.replace("/tabs/(tabs)/practice");
	}, [params.start, router, startedAt]);

	useEffect(() => {
		const timer = setInterval(() => setNowMs(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		if (!startedAt || finishReason) return;
		if (secondsLeft > 0) return;
		finishExam("timeout");
		router.push("/tabs/(questions)/exam/result");
	}, [finishExam, finishReason, router, secondsLeft, startedAt]);

	useEffect(() => {
		if (!startedAt || finishReason) return;
		if (wrongCount < STOP_AT_WRONG) return;
		finishExam("mistake_limit");
		router.push("/tabs/(questions)/exam/result");
	}, [finishExam, finishReason, router, startedAt, wrongCount]);

	useEffect(() => {
		if (!startedAt || finishReason) return;
		if (answeredCount !== total) return;
		finishExam("completed");
		router.push("/tabs/(questions)/exam/result");
	}, [answeredCount, finishExam, finishReason, router, startedAt, total]);

	useEffect(() => {
		return () => {
			if (autoNextTimerRef.current) {
				clearTimeout(autoNextTimerRef.current);
				autoNextTimerRef.current = null;
			}
			cardTranslateX.stopAnimation();
			isCardAnimatingRef.current = false;
			pendingIndexRef.current = null;
			animatingToIndexRef.current = null;
		};
	}, [cardTranslateX]);

	if (!questionData) {
		return (
			<Box className="flex-1 bg-background items-center justify-center px-6">
				<Heading className="text-2xl font-semibold text-center">
					{t("exam.noQuestions", "No questions")}
				</Heading>
				<Text className="mt-2 text-center text-muted-foreground">
					{t("exam.questionListEmpty", "Question list is empty.")}
				</Text>
			</Box>
		);
	}
	const questionId = questionData.id;
	const selectedIndex = answers[questionId];
	const canNext = currentIndex < total;
	const canPrev = currentIndex > 1;
	const canFinish = answeredCount === total;

	const handleBack = () => {
		Alert.alert(
			t("exam.exit.title", "Exit test"),
			t("exam.exit.message", "Do you want to leave?"),
			[
				{ text: t("exam.exit.cancel", "Cancel"), style: "cancel" },
				{
					text: t("exam.exit.confirm", "Exit"),
					style: "destructive",
					onPress: () => router.replace("/tabs/(tabs)/practice"),
				},
			],
			{ cancelable: true },
		);
	};

	const runQuestionTransition = useCallback(
		function runQuestionTransition(targetIndex: number) {
			const from = currentIndexRef.current;
			const target = clamp(targetIndex, 1, total);
			if (target === from) {
				const queued = pendingIndexRef.current;
				pendingIndexRef.current = null;
				if (queued !== null && queued !== from) {
					runQuestionTransition(queued);
				}
				return;
			}

			isCardAnimatingRef.current = true;
			animatingToIndexRef.current = target;
			const direction = target > from ? 1 : -1;
			const offset = Math.max(questionViewportWidthRef.current + 24, 360);

			Animated.timing(cardTranslateX, {
				toValue: -direction * offset,
				duration: SWIPE_PHASE_MS,
				easing: SWIPE_EASING,
				useNativeDriver: true,
			}).start(() => {
				setCurrentIndex(target);
				currentIndexRef.current = target;
				cardTranslateX.setValue(direction * offset);

				Animated.timing(cardTranslateX, {
					toValue: 0,
					duration: SWIPE_PHASE_MS,
					easing: SWIPE_EASING,
					useNativeDriver: true,
				}).start(() => {
					isCardAnimatingRef.current = false;
					animatingToIndexRef.current = null;
					const queued = pendingIndexRef.current;
					pendingIndexRef.current = null;
					if (queued !== null && queued !== currentIndexRef.current) {
						runQuestionTransition(queued);
					}
				});
			});
		},
		[cardTranslateX, total],
	);

	const goToQuestion = useCallback(
		(nextIndex: number) => {
			if (autoNextTimerRef.current) {
				clearTimeout(autoNextTimerRef.current);
				autoNextTimerRef.current = null;
			}
			const target = clamp(nextIndex, 1, total);
			const active = currentIndexRef.current;

			if (target === active && !isCardAnimatingRef.current) return;

			if (isCardAnimatingRef.current) {
				pendingIndexRef.current = target;
				return;
			}

			runQuestionTransition(target);
		},
		[runQuestionTransition, total],
	);

	const goNextQuestion = useCallback(() => {
		const base =
			pendingIndexRef.current ??
			animatingToIndexRef.current ??
			currentIndexRef.current;
		goToQuestion(base + 1);
	}, [goToQuestion]);

	const goPrevQuestion = useCallback(() => {
		const base =
			pendingIndexRef.current ??
			animatingToIndexRef.current ??
			currentIndexRef.current;
		goToQuestion(base - 1);
	}, [goToQuestion]);

	const ensureTriggerVisible = useCallback((index: number, animated = true) => {
		const layout = triggerLayoutsRef.current[index];
		const viewportWidth = triggerViewportWidthRef.current;
		if (!layout || viewportWidth <= 0) return;

		const margin = 12;
		const currentX = triggerScrollXRef.current;
		const itemStart = layout.x;
		const itemEnd = layout.x + layout.width;
		const visibleStart = currentX + margin;
		const visibleEnd = currentX + viewportWidth - margin;
		const contentWidth = triggerContentWidthRef.current;
		const maxScrollX = Math.max(0, contentWidth - viewportWidth);

		let targetX: number | null = null;
		if (itemStart < visibleStart) {
			targetX = Math.max(0, itemStart - margin);
		} else if (itemEnd > visibleEnd) {
			targetX = Math.min(maxScrollX, itemEnd - viewportWidth + margin);
		}

		if (targetX === null) return;
		triggerScrollRef.current?.scrollTo({ x: targetX, y: 0, animated });
	}, []);

	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			ensureTriggerVisible(currentIndex, true);
		});
		return () => cancelAnimationFrame(frame);
	}, [currentIndex, ensureTriggerVisible]);

	const handleOptionPress = (optionIndex: number) => {
		if (selectedIndex !== undefined) return;
		if (autoNextTimerRef.current) {
			clearTimeout(autoNextTimerRef.current);
			autoNextTimerRef.current = null;
		}
		setAnswer(questionId, optionIndex);
		const nextAnswers = { ...answers, [questionId]: optionIndex };
		const nextWrongCount = getWrongCount(nextAnswers, questions);
		if (nextWrongCount >= STOP_AT_WRONG) {
			finishExam("mistake_limit");
			router.push("/tabs/(questions)/exam/result");
			return;
		}

		if (autoAdvanceEnabled && canNext) {
			autoNextTimerRef.current = setTimeout(() => {
				autoNextTimerRef.current = null;
				goNextQuestion();
			}, ANSWER_FEEDBACK_MS);
		}
	};

	const handleNext = () => {
		if (autoNextTimerRef.current) {
			clearTimeout(autoNextTimerRef.current);
			autoNextTimerRef.current = null;
		}
		if (canNext) {
			goNextQuestion();
			return;
		}
		if (!canFinish) {
			Alert.alert(
				t("exam.alert.title", "Attention"),
				t("exam.alert.answerAll", "Answer all questions first."),
			);
			return;
		}
		finishExam("completed");
		router.push("/tabs/(questions)/exam/result");
	};

	return (
		<Box className="flex-1 bg-background">
			<Box className="px-5" style={{ paddingTop: insets.top + 8 }}>
				<Box className="flex-row items-center justify-between">
					<Button
						className="rounded-full h-[40px]"
						onPress={handleBack}
						variant="ghost"
					>
						<ArrowLeft color={iconColor} />
					</Button>
					<Box className="items-center">
						<Heading className="text-2xl font-semibold">
							{currentIndex}/{total}
						</Heading>
					</Box>
					<Box className="bg-brand/10 h-[40px] justify-center items-center rounded-full w-[70px]">
						<Text className="text-base w-[70px] text-center font-semibold text-brand">
							{formatClock(secondsLeft)}
						</Text>
					</Box>
				</Box>

				<ScrollView
					ref={triggerScrollRef}
					horizontal
					showsHorizontalScrollIndicator={false}
					className="mt-4 border-transparent p-[4px]"
					contentContainerStyle={{ gap: 3, paddingRight: 6 }}
					onLayout={(event) => {
						triggerViewportWidthRef.current = event.nativeEvent.layout.width;
						ensureTriggerVisible(currentIndex, false);
					}}
					onContentSizeChange={(width) => {
						triggerContentWidthRef.current = width;
						ensureTriggerVisible(currentIndex, false);
					}}
					onScroll={(event) => {
						triggerScrollXRef.current = event.nativeEvent.contentOffset.x;
					}}
					scrollEventThrottle={16}
				>
					{questions.map((item, index) => {
						const stepIndex = index + 1;
						const selected = answers[item.id];
						const isCurrent = stepIndex === currentIndex;
						const isAnswered = selected !== undefined;
						const isCorrect = isAnswered && selected === item.correctIndex;
						const isWrong = isAnswered && selected !== item.correctIndex;

						let bg = "bg-foreground/20";
						let rounded = null;

						if (isCorrect) {
							bg = "bg-brand";
						}
						if (isWrong) {
							bg = "bg-destructive";
						}
						if (isCurrent) {
							bg = isAnswered ? bg : "bg-foreground/40";
						}

						if (index === 0) {
							rounded = "rounded-l-full";
						} else if (index === questions.length - 1) {
							rounded = "rounded-r-full";
						}

						return (
							<Pressable
								key={item.id}
								onPress={() => goToQuestion(stepIndex)}
								onLayout={(event) => {
									const { x, width } = event.nativeEvent.layout;
									triggerLayoutsRef.current[stepIndex] = { x, width };
									if (stepIndex === currentIndex) {
										ensureTriggerVisible(stepIndex, false);
									}
								}}
							>
								<Box
									className={`${bg} ${rounded} flex-row justify-center h-[16px] min-w-[70px] items-center`}
								></Box>
							</Pressable>
						);
					})}
				</ScrollView>
			</Box>

			<ScrollView
				className="flex-1 mt-4"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
			>
				<Box
					className="mx-5 overflow-hidden"
					onLayout={(event) => {
						const width = event.nativeEvent.layout.width;
						if (width > 0) {
							questionViewportWidthRef.current = width;
						}
					}}
				>
					<Animated.View
						style={{
							transform: [{ translateX: cardTranslateX }],
						}}
					>
						<Box>
							<Box className="h-[210px] rounded-3xl overflow-hidden bg-card">
								<Image
									alt="question-image"
									className="w-full h-full object-cover"
									source={
										questionData.imageUrl
											? { uri: questionData.imageUrl }
											: require("../../../../assets/images/practice/books-ilustration.webp")
									}
								/>
							</Box>

							<Heading className="mt-5 text-2xl font-semibold">
								{questionData.question}
							</Heading>

							<Box className="mt-4 gap-3">
								{questionData.options.map((option, optionIndex) => {
									const isSelected = selectedIndex === optionIndex;
									const isCorrectOption =
										optionIndex === questionData.correctIndex;
									const isWrongSelected = isSelected && !isCorrectOption;
									const isCorrectSelected = isSelected && isCorrectOption;
									const showCorrectHint =
										selectedIndex !== undefined &&
										selectedIndex !== questionData.correctIndex &&
										isCorrectOption;

									return (
										<Pressable
											key={`${questionId}-${option}`}
											disabled={selectedIndex !== undefined}
											onPress={() => handleOptionPress(optionIndex)}
										>
											<Box
												className={[
													"rounded-2xl border px-4 py-4 flex-row items-center gap-3 bg-card",
													isWrongSelected
														? "border-destructive bg-destructive/10"
														: isCorrectSelected
															? "border-brand bg-brand/10"
															: showCorrectHint
																? "border-brand/40 bg-brand/5"
																: "border-border",
												].join(" ")}
											>
												<Box className="h-9 w-9 rounded-full items-center justify-center bg-background border border-border/50">
													<Text
														className={[
															"text-base font-semibold",
															isWrongSelected
																? "text-destructive"
																: isCorrectSelected
																	? "text-brand"
																	: showCorrectHint
																		? "text-brand"
																		: "text-foreground/75",
														].join(" ")}
													>
														{String.fromCharCode(65 + optionIndex)}
													</Text>
												</Box>

												<Text
													className={[
														"flex-1 font-medium",
														isWrongSelected
															? "text-destructive"
															: isCorrectSelected
																? "text-brand"
																: showCorrectHint
																	? "text-brand"
																	: "text-foreground",
													].join(" ")}
												>
													{option}
												</Text>
											</Box>
										</Pressable>
									);
								})}
							</Box>
						</Box>
					</Animated.View>
				</Box>
			</ScrollView>

			<Box
				className="absolute left-0 right-0 bottom-0 px-5 py-3 mb-3 bg-background border-t border-border/30"
				style={{ paddingBottom: Math.max(insets.bottom, 12) }}
			>
				<Box className="flex-row gap-3 items-center">
					<Button
						variant="ghost"
						onPress={() => canPrev && goPrevQuestion()}
						disabled={!canPrev}
						className={[
							"flex-1 h-12 rounded-2xl border",
							canPrev
								? "bg-background border-brand"
								: "bg-background border-brand opacity-50",
						].join(" ")}
					>
						<ChevronLeft color={iconColor} />

						<ButtonText className="text-base flex-row justify-center font-medium text-foreground">
							{t("exam.previous", "Previous")}
						</ButtonText>
					</Button>

					<Button
						variant="ghost"
						onPress={handleNext}
						className="flex-1 h-12 rounded-2xl bg-brand"
					>
						<ButtonText className="text-base font-medium text-primary-foreground">
							{canNext
								? t("common.next", "Next")
								: canFinish
									? t("exam.resultAction", "Result")
									: t("common.finish", "Finish")}
						</ButtonText>
						<ChevronRight color={iconColor} />
					</Button>
				</Box>
			</Box>
		</Box>
	);
}
