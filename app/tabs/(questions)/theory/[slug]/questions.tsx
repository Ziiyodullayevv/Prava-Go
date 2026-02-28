import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	Animated,
	Dimensions,
	Easing,
	Pressable,
	ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
	BookA,
	BookmarkPlus,
	ChevronLeft,
	ChevronRight,
	Ellipsis,
	Power,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Image } from "@/components/ui/image";
import { Button, ButtonText } from "@/components/ui/button";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";
import { useAutoAdvance } from "@/hooks/useAutoAdvance";
import { useI18n } from "@/locales/i18n-provider";
import { getLocalizedQuestions } from "@/features/questions/localized-questions";

const SECONDS_PER_QUESTION = 15;
const MIN_EXAM_SECONDS = 5 * 60;
const ANSWER_FEEDBACK_MS = 380;
const SWIPE_DURATION_MS = 250;
const SWIPE_PHASE_MS = SWIPE_DURATION_MS / 2;
const SWIPE_EASING = Easing.bezier(0.42, 0, 0.58, 1);

function clamp(n: number, min: number, max: number) {
	return Math.min(max, Math.max(min, n));
}

function formatClock(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getIndexFromParam(id: string | undefined, totalQuestions: number) {
	const parsed = Number(id);
	const maxIndex = Math.max(totalQuestions - 1, 0);
	if (!Number.isFinite(parsed)) return 0;
	return clamp(parsed - 1, 0, maxIndex);
}

export default function TheoryQuestionsScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{
		slug?: string;
		title?: string;
		session?: string;
		id?: string;
		auto?: string;
	}>();
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;
	const { language } = useI18n();
	const localizedQuestions = useMemo(
		() => getLocalizedQuestions(language, 20),
		[language],
	);

	const slug = params.slug ?? "road-and-traffic-signs";
	const { value: persistedAutoAdvance } = useAutoAdvance(slug);
	const routeAutoAdvance = useMemo(() => {
		if (params.auto === "1") return true;
		if (params.auto === "0") return false;
		return null;
	}, [params.auto]);
	const autoAdvanceEnabled = routeAutoAdvance ?? persistedAutoAdvance;

	const totalQuestions = localizedQuestions.length;
	const examSeconds = useMemo(
		() => Math.max(MIN_EXAM_SECONDS, totalQuestions * SECONDS_PER_QUESTION),
		[totalQuestions],
	);
	const initialIndex = getIndexFromParam(params.id, totalQuestions);

	const [secondsLeft, setSecondsLeft] = useState(examSeconds);
	const [currentIndex, setCurrentIndex] = useState(initialIndex);
	const [answers, setAnswers] = useState<Record<number, number>>({});
	const [isSubmitted, setIsSubmitted] = useState(false);

	const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const answeredQuestionIdsRef = useRef<Set<number>>(new Set());
	const currentIndexRef = useRef(initialIndex);
	const isAnimatingRef = useRef(false);
	const isTransitioningRef = useRef(false);
	const queuedIndexRef = useRef<number | null>(null);
	const cardTranslateX = useRef(new Animated.Value(0)).current;
	const questionViewportWidthRef = useRef(
		Math.max(320, Dimensions.get("window").width - 32),
	);

	const triggerScrollRef = useRef<ScrollView | null>(null);
	const triggerLayoutsRef = useRef<
		Record<number, { x: number; width: number }>
	>({});
	const triggerViewportWidthRef = useRef(0);
	const triggerContentWidthRef = useRef(0);
	const triggerScrollXRef = useRef(0);

	const clearAutoAdvanceTimer = () => {
		if (autoNextTimerRef.current) {
			clearTimeout(autoNextTimerRef.current);
			autoNextTimerRef.current = null;
		}
		isTransitioningRef.current = false;
	};

	useEffect(() => {
		const startIndex = getIndexFromParam(params.id, totalQuestions);
		clearAutoAdvanceTimer();
		setSecondsLeft(examSeconds);
		setCurrentIndex(startIndex);
		currentIndexRef.current = startIndex;
		setAnswers({});
		answeredQuestionIdsRef.current = new Set();
		setIsSubmitted(false);
		isAnimatingRef.current = false;
		isTransitioningRef.current = false;
		queuedIndexRef.current = null;
		cardTranslateX.setValue(0);
	}, [examSeconds, params.session, totalQuestions]);

	useEffect(() => {
		const timer = setInterval(() => {
			setSecondsLeft((prev) => Math.max(0, prev - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	useEffect(
		() => () => {
			clearAutoAdvanceTimer();
			cardTranslateX.stopAnimation();
			isAnimatingRef.current = false;
			isTransitioningRef.current = false;
			queuedIndexRef.current = null;
		},
		[],
	);

	useEffect(() => {
		currentIndexRef.current = currentIndex;
	}, [currentIndex]);

	const safeIndex = clamp(currentIndex, 0, totalQuestions - 1);
	const currentQuestion = localizedQuestions[safeIndex];
	const selectedOption = currentQuestion
		? answers[currentQuestion.id]
		: undefined;
	const isLast = safeIndex === totalQuestions - 1;
	const topicTitle = params.title ?? "Theory";
	const answeredCount = Object.keys(answers).length;
	const allAnswered = answeredCount === totalQuestions;
	const firstUnansweredIndex = localizedQuestions.findIndex(
		(question) => answers[question.id] === undefined,
	);

	const ensureTriggerVisible = (index: number, animated = true) => {
		const layout = triggerLayoutsRef.current[index];
		const viewport = triggerViewportWidthRef.current;
		if (!layout || viewport <= 0) return;

		const margin = 12;
		const currentX = triggerScrollXRef.current;
		const itemStart = layout.x;
		const itemEnd = layout.x + layout.width;
		const visibleStart = currentX + margin;
		const visibleEnd = currentX + viewport - margin;
		const contentWidth = triggerContentWidthRef.current;
		const maxScrollX = Math.max(0, contentWidth - viewport);

		let targetX: number | null = null;
		if (itemStart < visibleStart) {
			targetX = Math.max(0, itemStart - margin);
		} else if (itemEnd > visibleEnd) {
			targetX = Math.min(maxScrollX, itemEnd - viewport + margin);
		}

		if (targetX === null) return;
		triggerScrollRef.current?.scrollTo({ x: targetX, y: 0, animated });
	};

	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			ensureTriggerVisible(safeIndex, true);
		});
		return () => cancelAnimationFrame(frame);
	}, [safeIndex]);

	const runQuestionTransition = (targetIndex: number) => {
		const from = currentIndexRef.current;
		const target = clamp(targetIndex, 0, totalQuestions - 1);

		if (target === from) {
			isTransitioningRef.current = false;
			const queued = queuedIndexRef.current;
			queuedIndexRef.current = null;
			if (queued !== null && queued !== from) {
				runQuestionTransition(queued);
			}
			return;
		}

		isAnimatingRef.current = true;
		isTransitioningRef.current = true;
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
				isAnimatingRef.current = false;
				isTransitioningRef.current = false;
				const queued = queuedIndexRef.current;
				queuedIndexRef.current = null;
				if (queued !== null && queued !== currentIndexRef.current) {
					runQuestionTransition(queued);
				}
			});
		});
	};

	const jumpToQuestion = (target: number) => {
		cardTranslateX.stopAnimation();
		clearAutoAdvanceTimer();
		isAnimatingRef.current = false;
		isTransitioningRef.current = false;
		queuedIndexRef.current = null;
		cardTranslateX.setValue(0);
		setCurrentIndex(target);
		currentIndexRef.current = target;
	};

	const goToQuestion = (
		index: number,
		animate = false,
		source: "manual" | "auto" = "manual",
	) => {
		if (source === "manual") {
			clearAutoAdvanceTimer();
		}

		const target = clamp(index, 0, totalQuestions - 1);
		if (target === currentIndexRef.current && !isAnimatingRef.current) return;

		if (!animate) {
			jumpToQuestion(target);
			return;
		}

		if (isAnimatingRef.current) {
			queuedIndexRef.current = target;
			return;
		}

		if (source === "auto") {
			isTransitioningRef.current = true;
		}
		runQuestionTransition(target);
	};

	const handleSelectOption = (optionIndex: number) => {
		if (!currentQuestion) return;
		if (selectedOption !== undefined) return;
		if (answeredQuestionIdsRef.current.has(currentQuestion.id)) return;
		answeredQuestionIdsRef.current.add(currentQuestion.id);

		setAnswers((prev) => ({
			...prev,
			[currentQuestion.id]: optionIndex,
		}));

		if (!autoAdvanceEnabled || isLast || isTransitioningRef.current) return;

		clearAutoAdvanceTimer();
		isTransitioningRef.current = true;
		autoNextTimerRef.current = setTimeout(() => {
			autoNextTimerRef.current = null;
			const fromIndex = currentIndexRef.current;
			if (fromIndex >= totalQuestions - 1) {
				isTransitioningRef.current = false;
				return;
			}
			goToQuestion(fromIndex + 1, true, "auto");
		}, ANSWER_FEEDBACK_MS);
	};

	const submitAndGoToResult = (reason: "completed" | "timeout") => {
		if (isSubmitted) return;
		clearAutoAdvanceTimer();
		setIsSubmitted(true);

		const correctCount = localizedQuestions.reduce((acc, question) => {
			const selected = answers[question.id];
			if (selected === question.correctIndex) return acc + 1;
			return acc;
		}, 0);

		router.push({
			pathname: "/tabs/(questions)/theory/[slug]/result",
			params: {
				slug,
				title: topicTitle,
				correct: String(correctCount),
				total: String(totalQuestions),
				answered: String(answeredCount),
				passMark: "80",
				reason,
			},
		});
	};

	useEffect(() => {
		if (secondsLeft > 0 || isSubmitted) return;
		submitAndGoToResult("timeout");
	}, [isSubmitted, secondsLeft]);

	const handleNext = () => {
		if (isLast) {
			if (!allAnswered && firstUnansweredIndex !== -1) {
				goToQuestion(firstUnansweredIndex);
				Alert.alert(
					"Savollar qolib ketgan",
					`Hamma savollarni belgilang. Siz ${firstUnansweredIndex + 1}-savolga yo'naltirildingiz.`,
				);
				return;
			}

			submitAndGoToResult("completed");
			return;
		}

		goToQuestion(safeIndex + 1);
	};

	if (!currentQuestion) {
		return (
			<Box className="flex-1 bg-background items-center justify-center px-6">
				<Heading className="text-2xl font-semibold text-center">
					No questions
				</Heading>
				<Text className="mt-2 text-center text-muted-foreground">
					Question list is empty.
				</Text>
			</Box>
		);
	}

	return (
		<Box className="flex-1 bg-background pt-safe">
			<Box className="mt-2">
				<Box className="flex-row px-4 items-center justify-between">
					<Pressable onPress={() => router.back()}>
						<Box className="h-12 w-12 rounded-full bg-card items-center justify-center shadow-hard-5">
							<Power size={22} strokeWidth={2} color={palette.text} />
						</Box>
					</Pressable>

					<Box className="items-center">
						<Heading className="text-lg font-semibold">
							{formatClock(secondsLeft)}
						</Heading>
						<Text className="text-xs text-muted-foreground">
							{totalQuestions} questions
						</Text>
					</Box>

					<Box className="flex-row items-center gap-2">
						<Box className="h-12 w-12 rounded-full bg-card items-center justify-center shadow-hard-5">
							<Ellipsis size={20} strokeWidth={2} color={palette.text} />
						</Box>
					</Box>
				</Box>

				<ScrollView
					ref={triggerScrollRef}
					horizontal
					showsHorizontalScrollIndicator={false}
					className="my-3"
					contentContainerStyle={{ gap: 6, paddingRight: 16, paddingLeft: 16 }}
					onLayout={(event) => {
						triggerViewportWidthRef.current = event.nativeEvent.layout.width;
						ensureTriggerVisible(safeIndex, false);
					}}
					onContentSizeChange={(width) => {
						triggerContentWidthRef.current = width;
						ensureTriggerVisible(safeIndex, false);
					}}
					onScroll={(event) => {
						triggerScrollXRef.current = event.nativeEvent.contentOffset.x;
					}}
					scrollEventThrottle={16}
				>
					{localizedQuestions.map((question, index) => {
						const selected = answers[question.id];
						const answered = selected !== undefined;
						const isWrong = answered && selected !== question.correctIndex;
						const isCorrect = answered && selected === question.correctIndex;
						const isActive = index === safeIndex;

						return (
							<Pressable
								key={question.id}
								onPress={() => goToQuestion(index)}
								onLayout={(event) => {
									const { x, width } = event.nativeEvent.layout;
									triggerLayoutsRef.current[index] = { x, width };
									if (index === safeIndex) {
										ensureTriggerVisible(index, false);
									}
								}}
							>
								<Box
									className={[
										"h-10 min-w-10 border-2 rounded-xl items-center justify-center",
										isWrong
											? "border-destructive bg-card"
											: isCorrect
												? "border-brand bg-card"
												: isActive
													? "border-foreground/35 bg-card"
													: "border-transparent bg-foreground/10",
										isActive ? "border-2 border-black" : "",
									].join(" ")}
								>
									<Text
										className={[
											"font-medium text-sm",
											isWrong ? "text-destructive" : "",
											isCorrect ? "text-brand" : "",
											isActive ? "font-semibold" : "",
										].join(" ")}
									>
										{index + 1}
									</Text>
								</Box>
							</Pressable>
						);
					})}
				</ScrollView>
			</Box>

			<ScrollView
				className="flex-1 rounded-t-[30px] bg-card"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					flexGrow: 1,
					paddingBottom: Math.max(insets.bottom, 12) + 84,
				}}
			>
				<Box
					className="flex-1 overflow-hidden"
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
							flex: 1,
						}}
					>
						<Box className="bg-card flex-1 p-4">
							<Image
								source={
									currentQuestion.imageUrl
										? { uri: currentQuestion.imageUrl }
										: require("../../../../../assets/images/practice/books-ilustration.webp")
								}
								alt={topicTitle}
								className="w-full h-[210px] rounded-2xl"
								resizeMode="cover"
							/>

							<Heading className="mt-4 text-xl font-semibold">
								{currentQuestion.question}
							</Heading>

							<Box className="mt-4 gap-3">
								{currentQuestion.options.map((option, index) => {
									const selected = selectedOption === index;
									const isCorrectOption =
										index === currentQuestion.correctIndex;
									const isWrongSelected = selected && !isCorrectOption;
									const isCorrectSelected = selected && isCorrectOption;
									const showCorrectHint =
										selectedOption !== undefined &&
										selectedOption !== currentQuestion.correctIndex &&
										isCorrectOption;

									return (
										<Pressable
											key={`${currentQuestion.id}-${option}`}
											disabled={selectedOption !== undefined}
											onPress={() => handleSelectOption(index)}
										>
											<Box
												className={[
													"rounded-2xl border shadow-soft-1 bg-card px-4 py-4 flex-row items-center gap-3",
													isWrongSelected
														? "border-destructive bg-destructive/50"
														: isCorrectSelected
															? "border-brand bg-brand/50"
															: showCorrectHint
																? "border-brand bg-brand/50"
																: "bg-card border-border",
												].join(" ")}
											>
													<Box className="h-8 w-8 shadow-hard-3 rounded-full bg-card items-center justify-center">
														<Text className="text-sm font-semibold">
															{`F${index + 1}`}
														</Text>
													</Box>
												<Text
													className={[
														isWrongSelected
															? "text-white"
															: isCorrectSelected
																? "text-white"
																: showCorrectHint
																	? "text-white"
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
				className="absolute left-0 right-0 bottom-0 px-4 pt-3 bg-card border-t border-border/30"
				style={{ paddingBottom: Math.max(insets.bottom, 12) }}
			>
				<Box className="flex-row items-center justify-between gap-3">
					<Box className="flex-row items-center gap-2">
						<Pressable onPress={() => goToQuestion(safeIndex - 1)}>
							<Box className="h-12 w-12 rounded-full bg-card shadow-hard-2 items-center justify-center">
								<ChevronLeft size={20} color={palette.text} />
							</Box>
						</Pressable>
						<Pressable>
							<Box className="h-12 w-12 rounded-full bg-card shadow-hard-2 items-center justify-center">
								<BookA size={20} color={palette.text} />
							</Box>
						</Pressable>
						<Pressable>
							<Box className="h-12 w-12 rounded-full bg-card shadow-hard-2 items-center justify-center">
								<BookmarkPlus size={20} color={palette.text} />
							</Box>
						</Pressable>
					</Box>

					<Button
						className="h-12 px-8 shadow-hard-1 rounded-2xl bg-primary"
						onPress={handleNext}
					>
						<ButtonText className="text-base font-semibold text-primary-foreground">
							{isLast ? (allAnswered ? "Finish" : "Check Missing") : "Next"}
						</ButtonText>
						<ChevronRight size={18} color={palette.background} />
					</Button>
				</Box>
			</Box>
		</Box>
	);
}
