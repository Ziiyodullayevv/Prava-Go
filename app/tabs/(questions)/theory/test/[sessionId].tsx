import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
	BookA,
	BookmarkPlus,
	ChevronLeft,
	ChevronRight,
	Lightbulb,
	Power,
	Search,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	BottomSheet,
	BottomSheetBackdrop,
	type BottomSheetController,
	BottomSheetContent,
	BottomSheetDragIndicator,
	BottomSheetPortal,
	BottomSheetScrollView,
} from "@/components/ui/bottomsheet";
import { Box } from "@/components/ui/box";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Image } from "@/components/ui/image";
import {
	ImageViewer,
	ImageViewerCloseButton,
	ImageViewerContent,
	ImageViewerCounter,
	ImageViewerNavigation,
	ImageViewerTrigger,
} from "@/components/ui/image-viewer";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalContent,
	ModalFooter,
} from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import { Colors } from "@/constants/Colors";
import {
	AnswerOption,
	QuestionNavigator,
	type AnswerOptionStatus,
	type QuestionNavigatorItem,
} from "@/features/theory/components";
import { completeTheorySession } from "@/features/theory/api";
import {
	loadBookmarkedQuestionIds,
	toggleBookmarkedQuestion,
} from "@/features/theory/bookmarks";
import {
	enqueueSessionCompletion,
	removeQueuedSessionCompletion,
} from "@/features/theory/offline-queue";
import {
	AUTO_ADVANCE_DELAY_MS,
	MIN_TEST_SECONDS,
	SECONDS_PER_QUESTION,
} from "@/features/theory/constants";
import { useTheorySession } from "@/features/theory/hooks";
import type { SessionQuestion } from "@/features/theory/types";
import { useI18n } from "@/locales/i18n-provider";
import { Divider } from "@/components/ui/divider";

function clamp(n: number, min: number, max: number) {
	return Math.min(max, Math.max(min, n));
}

function formatClock(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getErrorMessage(err: unknown, fallback: string) {
	if (err instanceof Error && err.message) return err.message;
	if (err && typeof err === "object" && "message" in err) {
		const message = (err as { message?: unknown }).message;
		if (typeof message === "string" && message.trim().length > 0) {
			return message;
		}
	}
	return fallback;
}

function toTimestamp(value?: string | null) {
	if (!value) return 0;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function mergeSessionQuestions(
	incoming: SessionQuestion[],
	local: SessionQuestion[],
) {
	if (local.length === 0) return incoming;

	const localById = new Map(
		local.map((item) => [item.sessionQuestionId, item] as const),
	);

	return incoming.map((remoteItem) => {
		const localItem = localById.get(remoteItem.sessionQuestionId);
		if (!localItem) return remoteItem;
		if (!localItem.selectedOptionId) return remoteItem;
		if (!remoteItem.selectedOptionId) return localItem;

		const localAnsweredAt = toTimestamp(localItem.answeredAt);
		const remoteAnsweredAt = toTimestamp(remoteItem.answeredAt);

		return localAnsweredAt >= remoteAnsweredAt ? localItem : remoteItem;
	});
}

const unansweredExplanationImage = require("../../../../../assets/images/practice/is-answer.png");
const MOCK_EXAM_SECONDS = 25 * 60;
const MOCK_EXAM_WRONG_LIMIT = 3;
const MARATHON_SECONDS_BY_QUESTION_COUNT: Record<number, number> = {
	50: 60 * 60,
	100: 120 * 60,
	150: 180 * 60,
};

function getMarathonDurationSeconds(questionCount: number) {
	const normalizedQuestionCount = Math.max(1, Math.floor(questionCount));
	const mappedSeconds =
		MARATHON_SECONDS_BY_QUESTION_COUNT[normalizedQuestionCount];

	if (typeof mappedSeconds === "number") {
		return mappedSeconds;
	}

	return normalizedQuestionCount * 60;
}

export default function TheorySessionTestScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { colorMode } = useAppTheme();
	const { user } = useAuth();
	const { language, t } = useI18n();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;
	const primaryForegroundColor = isDark ? "#171717" : "#FAFAFA";
	const params = useLocalSearchParams<{ sessionId?: string }>();
	const sessionId =
		typeof params.sessionId === "string" ? params.sessionId : "";

	const { session, isLoading, error, reload } = useTheorySession(
		user?.id,
		sessionId,
		language,
	);

	const [questions, setQuestions] = useState<SessionQuestion[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [secondsLeft, setSecondsLeft] = useState(MIN_TEST_SECONDS);
	const [scoreCorrect, setScoreCorrect] = useState(0);
	const [scoreIncorrect, setScoreIncorrect] = useState(0);
	const [isFinalizing, setIsFinalizing] = useState(false);
	const [finalizeError, setFinalizeError] = useState("");
	const [isExitModalOpen, setIsExitModalOpen] = useState(false);
	const [isUnansweredModalOpen, setIsUnansweredModalOpen] = useState(false);
	const [firstUnansweredIndex, setFirstUnansweredIndex] = useState<
		number | null
	>(null);
	const [bookmarkedQuestionIds, setBookmarkedQuestionIds] = useState<Set<string>>(
		new Set(),
	);
	const [isBookmarkUpdating, setIsBookmarkUpdating] = useState(false);
	const explanationSheetRef = useRef<BottomSheetController | null>(null);
	const didNavigateResultRef = useRef(false);
	const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const answeredQuestionIdsRef = useRef<Set<string>>(new Set());
	const questionsRef = useRef<SessionQuestion[]>([]);
	const hydratedSessionIdRef = useRef<string | null>(null);

	useEffect(() => {
		questionsRef.current = questions;
	}, [questions]);

	useEffect(() => {
		if (!session) return;

		const mergedQuestions = mergeSessionQuestions(
			session.questions,
			questionsRef.current,
		);
		setQuestions(mergedQuestions);
		questionsRef.current = mergedQuestions;

		const nextScoreCorrect = mergedQuestions.filter(
			(item) => item.selectedOptionId && item.isCorrect === true,
		).length;
		const nextScoreIncorrect = mergedQuestions.filter(
			(item) => item.selectedOptionId && item.isCorrect === false,
		).length;
		setScoreCorrect(nextScoreCorrect);
		setScoreIncorrect(nextScoreIncorrect);

		answeredQuestionIdsRef.current = new Set(
			mergedQuestions
				.filter((item) => Boolean(item.selectedOptionId))
				.map((item) => item.sessionQuestionId),
		);

		const isNewSession = hydratedSessionIdRef.current !== session.id;
		if (isNewSession) {
			const firstUnanswered = mergedQuestions.findIndex(
				(item) => !item.selectedOptionId,
			);
			setCurrentIndex(
				firstUnanswered === -1
					? Math.max(mergedQuestions.length - 1, 0)
					: firstUnanswered,
			);

			const duration =
				session.mode === "mock_exam"
					? MOCK_EXAM_SECONDS
					: session.mode === "marathon"
						? getMarathonDurationSeconds(mergedQuestions.length)
					: Math.max(
							MIN_TEST_SECONDS,
							mergedQuestions.length * SECONDS_PER_QUESTION,
						);
			setSecondsLeft(duration);
			didNavigateResultRef.current = false;
			hydratedSessionIdRef.current = session.id;
		} else {
			setCurrentIndex((prev) =>
				clamp(prev, 0, Math.max(mergedQuestions.length - 1, 0)),
			);
		}
	}, [session]);

	useEffect(() => {
		if (questions.length === 0) return;
		const timer = setInterval(() => {
			setSecondsLeft((prev) => Math.max(0, prev - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, [questions.length]);

	useEffect(() => {
		return () => {
			if (autoNextTimerRef.current) {
				clearTimeout(autoNextTimerRef.current);
				autoNextTimerRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		let isCancelled = false;

		const loadBookmarks = async () => {
			if (!user?.id) {
				if (!isCancelled) setBookmarkedQuestionIds(new Set());
				return;
			}

			try {
				const ids = await loadBookmarkedQuestionIds(user.id);
				if (isCancelled) return;
				setBookmarkedQuestionIds(new Set(ids));
			} catch {
				if (isCancelled) return;
				setBookmarkedQuestionIds(new Set());
			}
		};

		loadBookmarks().catch(() => {});

		return () => {
			isCancelled = true;
		};
	}, [user?.id]);

	const totalQuestions = questions.length;
	const safeIndex = clamp(currentIndex, 0, Math.max(totalQuestions - 1, 0));
	const currentQuestion = questions[safeIndex] ?? null;
	const isMockExam = session?.mode === "mock_exam";
	const isMarathon = session?.mode === "marathon";
	const isMistakesPractice = session?.mode === "mistakes_practice";
	const passMark = isMockExam
		? clamp(
				Math.round(
					((Math.max(totalQuestions, 1) - 2) / Math.max(totalQuestions, 1)) * 100,
				),
				0,
				100,
			)
		: 80;
	const answeredCount = useMemo(
		() => questions.filter((item) => Boolean(item.selectedOptionId)).length,
		[questions],
	);
	const isLast = safeIndex === totalQuestions - 1;
	const currentExplanation =
		currentQuestion?.selectedOptionId && currentQuestion.explanation
			? currentQuestion.explanation.trim()
			: "";
	const hasCurrentAnswer = Boolean(currentQuestion?.selectedOptionId);
	const isCurrentQuestionBookmarked = Boolean(
		currentQuestion && bookmarkedQuestionIds.has(currentQuestion.questionId),
	);
	const questionImages = useMemo(
		() =>
			currentQuestion?.imageUrl
				? [
						{
							url: currentQuestion.imageUrl,
							alt: session?.topicTitle ?? t("theory.questions", "Question"),
						},
					]
				: [],
		[currentQuestion?.imageUrl, session?.topicTitle, t],
	);

	const goToResult = async (
		reason: "completed" | "timeout" | "mistake_limit",
	) => {
		if (!user?.id || !session || didNavigateResultRef.current) return;
		didNavigateResultRef.current = true;
		setFinalizeError("");
		setIsFinalizing(true);

		try {
			const answeredPayload = questions
				.filter((item) => item.selectedOptionId && item.isCorrect !== null)
				.map((item) => ({
					sessionQuestionId: item.sessionQuestionId,
					questionId: item.questionId,
					selectedOptionId: item.selectedOptionId as string,
					isCorrect: Boolean(item.isCorrect),
					answeredAt: item.answeredAt ?? new Date().toISOString(),
				}));

			const localCorrect = answeredPayload.filter(
				(item) => item.isCorrect,
			).length;
			const localIncorrect = answeredPayload.length - localCorrect;

			// Queue remote sync payload first.
			await enqueueSessionCompletion({
				kind: "complete_session",
				userId: user.id,
				sessionId: session.id,
				answers: answeredPayload,
				queuedAt: new Date().toISOString(),
			});

			// Apply local session/stat updates immediately so practice stats refresh on first back.
			await completeTheorySession({
				userId: user.id,
				sessionId: session.id,
				answers: answeredPayload,
				syncRemote: false,
			});

			setScoreCorrect(localCorrect);
			setScoreIncorrect(localIncorrect);

			router.replace({
				pathname: "/tabs/(questions)/theory/[slug]/result",
				params: {
					sessionId: session.id,
					slug: session.topicSlug
						?? (
							isMockExam
								? "mock-exam"
								: isMarathon
									? "marathon"
									: isMistakesPractice
										? "mistakes"
										: "theory"
						),
					title:
						session.topicTitle ??
						(isMockExam
							? t("practice.mockExam", "Mock Exam")
							: isMarathon
								? t("practice.explore.marathon.title", "Marathon")
								: isMistakesPractice
									? t("practice.explore.mistakes.title", "Mistakes")
							: t("theory.title", "Theory")),
					correct: String(localCorrect),
					total: String(totalQuestions),
					answered: String(answeredCount),
					passMark: String(passMark),
					reason,
				},
			});

			// Non-blocking best-effort remote sync. Queue item is removed on success.
			void completeTheorySession({
				userId: user.id,
				sessionId: session.id,
				answers: answeredPayload,
				syncRemote: true,
			})
				.then(() => removeQueuedSessionCompletion(user.id, session.id))
				.catch(() => {});
		} catch (err) {
			didNavigateResultRef.current = false;
			const message = getErrorMessage(
				err,
				t(
					"theory.session.saveError",
					"Something went wrong while saving the test result.",
				),
			);
			setFinalizeError(message);
		} finally {
			setIsFinalizing(false);
		}
	};

	useEffect(() => {
		if (secondsLeft > 0) return;
		if (!session || totalQuestions === 0) return;
		goToResult("timeout").catch(() => {});
	}, [secondsLeft, session, totalQuestions]);

	useEffect(() => {
		if (!session || totalQuestions === 0) return;
		if (answeredCount !== totalQuestions) return;
		if (!isLast || !hasCurrentAnswer) return;
		if (isFinalizing || didNavigateResultRef.current) return;
		goToResult("completed").catch(() => {});
	}, [
		session,
		totalQuestions,
		answeredCount,
		isLast,
		hasCurrentAnswer,
		isFinalizing,
	]);

	useEffect(() => {
		if (!session || totalQuestions === 0) return;
		if (session.mode !== "mock_exam") return;
		if (scoreIncorrect < MOCK_EXAM_WRONG_LIMIT) return;
		if (isFinalizing || didNavigateResultRef.current) return;
		if (autoNextTimerRef.current) {
			clearTimeout(autoNextTimerRef.current);
			autoNextTimerRef.current = null;
		}
		goToResult("mistake_limit").catch(() => {});
	}, [session, totalQuestions, scoreIncorrect, isFinalizing]);

	const handleSelectOption = (optionId: string) => {
		if (!session || !currentQuestion) return;
		if (currentQuestion.selectedOptionId) return;
		if (answeredQuestionIdsRef.current.has(currentQuestion.sessionQuestionId))
			return;

		const selectedOption = currentQuestion.options.find(
			(option) => option.id === optionId,
		);
		if (!selectedOption) return;

		answeredQuestionIdsRef.current.add(currentQuestion.sessionQuestionId);
		const answeredAt = new Date().toISOString();
		setQuestions((prev) => {
			const nextQuestions = prev.map((item) =>
				item.sessionQuestionId === currentQuestion.sessionQuestionId
					? item.selectedOptionId
						? item
						: {
								...item,
								selectedOptionId: optionId,
								isCorrect: selectedOption.isCorrect,
								answeredAt,
							}
					: item,
			);
			questionsRef.current = nextQuestions;
			return nextQuestions;
		});

		if (selectedOption.isCorrect) {
			setScoreCorrect((prev) => prev + 1);
		} else {
			setScoreIncorrect((prev) => prev + 1);
		}

		if (session.settings.autoAdvance && safeIndex < totalQuestions - 1) {
			if (autoNextTimerRef.current) {
				clearTimeout(autoNextTimerRef.current);
			}
			autoNextTimerRef.current = setTimeout(() => {
				setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
				autoNextTimerRef.current = null;
			}, AUTO_ADVANCE_DELAY_MS);
		}
	};

	const handleToggleBookmark = async () => {
		if (!user?.id || !currentQuestion) return;
		if (isBookmarkUpdating) return;
		setIsBookmarkUpdating(true);
		const targetQuestionId = currentQuestion.questionId;

		try {
			const { isBookmarked } = await toggleBookmarkedQuestion(
				user.id,
				targetQuestionId,
			);
			setBookmarkedQuestionIds((prev) => {
				const next = new Set(prev);
				if (isBookmarked) {
					next.add(targetQuestionId);
				} else {
					next.delete(targetQuestionId);
				}
				return next;
			});
		} finally {
			setIsBookmarkUpdating(false);
		}
	};

	const handleNext = async () => {
		if (totalQuestions === 0) return;

		if (isLast) {
			if (answeredCount < totalQuestions) {
				const firstUnanswered = questions.findIndex(
					(item) => !item.selectedOptionId,
				);
				if (firstUnanswered >= 0) {
					setCurrentIndex(firstUnanswered);
					setFirstUnansweredIndex(firstUnanswered);
					setIsUnansweredModalOpen(true);
				}
				return;
			}

			await goToResult("completed");
			return;
		}

		setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
	};

	const navigatorItems = useMemo<QuestionNavigatorItem[]>(
		() =>
			questions.map((item, index) => {
				let status: QuestionNavigatorItem["status"] = "default";
				if (index === safeIndex) {
					status = "current";
				} else if (item.selectedOptionId && item.isCorrect === false) {
					status = "wrong";
				} else if (item.selectedOptionId && item.isCorrect === true) {
					status = "correct";
				} else if (item.selectedOptionId) {
					status = "answered";
				}

				return {
					key: item.sessionQuestionId,
					label: String(index + 1),
					status,
				};
			}),
		[questions, safeIndex],
	);

	if (isLoading) {
		return (
			<Box className="flex-1 bg-background items-center justify-center px-6">
				<Heading className="text-2xl font-semibold text-center">
					{t("common.loading", "Loading...")}
				</Heading>
				<Text className="mt-2 text-center text-muted-foreground">
					{t("theory.session.loadingDescription", "Loading test session.")}
				</Text>
			</Box>
		);
	}

	if (error || !session) {
		return (
			<Box className="flex-1 bg-background items-center justify-center px-6">
				<Heading className="text-2xl font-semibold text-center">
					{t("common.error", "Error")}
				</Heading>
				<Text className="mt-2 text-center text-destructive">
					{error || t("theory.session.notFound", "Test session not found.")}
				</Text>
				<Button className="mt-4" onPress={() => reload()}>
					<ButtonText>{t("common.retry", "Retry")}</ButtonText>
				</Button>
			</Box>
		);
	}

	if (!currentQuestion) {
		return (
			<Box className="flex-1 bg-background items-center justify-center px-6">
				<Heading className="text-2xl font-semibold text-center">
					{t("exam.noQuestions", "No questions")}
				</Heading>
				<Text className="mt-2 text-center text-muted-foreground">
					{t("theory.session.empty", "Session has no questions.")}
				</Text>
			</Box>
		);
	}

	return (
		<BottomSheet ref={explanationSheetRef} snapToIndex={0}>
				<Box className="flex-1 bg-background pt-safe">
					<Box className="mt-2">
						<Box className="flex-row px-4 items-center justify-between">
							<Pressable onPress={() => setIsExitModalOpen(true)}>
								<Box className="h-12 w-12 rounded-full bg-card items-center justify-center shadow-hard-5">
									<Power size={22} strokeWidth={2} color={palette.text} />
								</Box>
							</Pressable>

							<Box className="items-center">
								<Heading className="text-lg font-semibold">
									{formatClock(secondsLeft)}
								</Heading>
								<Text className="text-xs text-muted-foreground">
									{totalQuestions} {t("common.questionsWord", "questions")}
								</Text>
							</Box>

							<Pressable onPress={() => explanationSheetRef.current?.open()}>
								<Box className="h-12 w-12 rounded-full bg-card items-center justify-center shadow-hard-5">
									<Lightbulb
										size={20}
										strokeWidth={2}
										color={currentExplanation ? palette.tint : palette.text}
									/>
								</Box>
							</Pressable>
						</Box>

					<QuestionNavigator
						items={navigatorItems}
						onPress={(index) => setCurrentIndex(index)}
					/>
				</Box>

				<ScrollView
					className="flex-1 rounded-t-[30px] bg-card"
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{
						flexGrow: 1,
						paddingBottom: Math.max(insets.bottom, 12) + 84,
					}}
				>
					<Box className="bg-card flex-1 p-4">
						{questionImages.length > 0 ? (
							<ImageViewer images={questionImages}>
								<ImageViewerTrigger className="rounded-2xl overflow-hidden">
									<Box className="relative rounded-2xl overflow-hidden">
										<Box className="w-full h-[220px] rounded-2xl border border-border/40 bg-background items-center justify-center overflow-hidden">
											<Image
												source={{ uri: questionImages[0]?.url }}
												alt={
													questionImages[0]?.alt ??
													t("theory.questions", "Question")
												}
												className="w-full h-full"
												resizeMode="contain"
											/>
										</Box>
										<Box
											pointerEvents="none"
											className="absolute right-3 bottom-3 h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/35"
										>
											<Search size={14} color="#ffffff" />
										</Box>
									</Box>
								</ImageViewerTrigger>

								<ImageViewerContent>
									<ImageViewerCloseButton />
									<ImageViewerNavigation />
									<ImageViewerCounter />
								</ImageViewerContent>
							</ImageViewer>
						) : null}

						<Heading className="mt-4 text-xl font-semibold">
							{currentQuestion.prompt}
						</Heading>

						<Box className="mt-4 gap-3">
							{currentQuestion.options.map((option, optionIndex) => {
								const isSelected =
									currentQuestion.selectedOptionId === option.id;
								const hasAnswer = Boolean(currentQuestion.selectedOptionId);

								let status: AnswerOptionStatus = "default";
								if (!hasAnswer && isSelected) {
									status = "selected";
								} else if (
									hasAnswer &&
									isSelected &&
									currentQuestion.isCorrect
								) {
									status = "correct";
								} else if (
									hasAnswer &&
									isSelected &&
									currentQuestion.isCorrect === false
								) {
									status = "wrong";
								} else if (
									hasAnswer &&
									currentQuestion.isCorrect === false &&
									option.isCorrect
								) {
									status = "hint-correct";
								}

								return (
									<AnswerOption
										key={option.id}
										label={`F${optionIndex + 1}`}
										text={option.text}
										status={status}
										disabled={hasAnswer || isFinalizing}
										onPress={() => handleSelectOption(option.id)}
									/>
								);
							})}
						</Box>

						{finalizeError ? (
							<Text className="mt-3 text-sm text-destructive">
								{finalizeError}
							</Text>
						) : null}
					</Box>
				</ScrollView>

				<Box
					className="absolute left-0 right-0 bottom-0 px-4 pt-3 bg-card border-t border-border/40"
					style={{ paddingBottom: Math.max(insets.bottom, 12) }}
				>
					<Box className="flex-row items-center justify-between mb-2 px-1">
						<Text className="text-sm text-muted-foreground">
							{t("theory.correct", "Correct")}: {scoreCorrect}
						</Text>
						<Text className="text-sm text-muted-foreground">
							{t("theory.incorrect", "Incorrect")}: {scoreIncorrect}
						</Text>
					</Box>

					<Box className="flex-row items-center justify-between gap-3">
						<Box className="flex-row items-center gap-2">
							<Pressable
								onPress={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
								disabled={isFinalizing || safeIndex === 0}
							>
								<Box
									className={[
										"h-12 w-12 border-border border rounded-full bg-card dark:bg-background dark:shadow-sm dark:shadow-white/5 items-center justify-center",
										isFinalizing || safeIndex === 0 ? "opacity-40" : "",
									].join(" ")}
								>
									<ChevronLeft size={20} color={palette.text} />
								</Box>
							</Pressable>

							<Pressable
								onPress={handleToggleBookmark}
								disabled={isFinalizing || isBookmarkUpdating || !currentQuestion}
							>
								<Box
									className={[
										"h-12 w-12 dark:bg-background dark:shadow-sm dark:shadow-white border-border border rounded-full bg-card shadow-hard-2 items-center justify-center",
										isCurrentQuestionBookmarked
											? "border-brand bg-brand/10"
											: "",
										isFinalizing || isBookmarkUpdating || !currentQuestion
											? "opacity-40"
											: "",
									].join(" ")}
								>
									<BookmarkPlus
										size={20}
										color={
											isCurrentQuestionBookmarked
												? palette.tint
												: palette.text
										}
									/>
								</Box>
							</Pressable>
						</Box>

						<Button
							className="h-12 px-8 shadow-hard-1 rounded-2xl bg-primary"
							onPress={handleNext}
							disabled={isFinalizing}
						>
							{isFinalizing ? (
								<ButtonSpinner color={primaryForegroundColor} />
							) : null}
							<ButtonText className="text-base font-semibold text-primary-foreground">
								{isFinalizing
									? t("common.saving", "Saving...")
									: isLast
										? t("common.finish", "Finish")
										: t("common.next", "Next")}
							</ButtonText>
							{isFinalizing ? null : (
								<ChevronRight size={18} color={palette.background} />
							)}
						</Button>
					</Box>
				</Box>

				<BottomSheetPortal
					backgroundStyle={{
						borderTopLeftRadius: 30,
						borderTopRightRadius: 30,
						opacity: 0,
					}}
					snapPoints={["60%", "100%"]}
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
								{/* {t("theory.explanation", "Explanation")} */}
								Tushuntirish
							</Text>
						</BottomSheetDragIndicator>
					)}
				>
					<BottomSheetContent className="px-5 pb-0 bg-card h-full">
						<BottomSheetScrollView
							showsVerticalScrollIndicator={false}
							contentContainerStyle={{
								paddingBottom: Math.max(insets.bottom, 20),
							}}
						>
							{hasCurrentAnswer ? (
								<Box className="w-full px-1 py-3">
									<Text className="mt-2 text-base leading-7 text-justify hyphens-auto text-foreground">
										{currentExplanation}
									</Text>
								</Box>
							) : (
								<Box className="w-full items-center justify-center px-1 py-3">
									<Box className="w-full p-5 items-center">
										<Image
											source={unansweredExplanationImage}
											alt={t(
												"theory.explanationUnavailable",
												"Explanation appears after you answer.",
											)}
											className="h-[170px] w-[170px] rounded-3xl"
											resizeMode="contain"
										/>
										<Text className="mt-4 text-center text-base">
											{t(
												"theory.explanationUnavailable",
												"Izoh javob tanlangandan keyin ko'rinadi.",
											)}
										</Text>
									</Box>
								</Box>
							)}
						</BottomSheetScrollView>
					</BottomSheetContent>
				</BottomSheetPortal>

				<Modal
					isOpen={isUnansweredModalOpen}
					onClose={() => setIsUnansweredModalOpen(false)}
					size="lg"
				>
					<ModalBackdrop className="bg-foreground/20 !backdrop-blur-2xl" />
					<ModalContent className="rounded-[30px] bg-background p-5">
						<ModalBody className="mt-3 text-center mb-5">
							<Image
								className="mx-auto"
								source={require("../../../../../assets/images/alert.webp")}
								alt=""
							/>
							<Divider className="mx-4 my-4" />
							<Heading className="text-center" size="md">
								{t("theory.alert.unansweredTitle", "Questions remain")}
							</Heading>
							<Text className="text-base text-center mt-1 text-muted-foreground">
								{`${t("theory.alert.unansweredMessagePrefix", "Unanswered question:")} ${(firstUnansweredIndex ?? 0) + 1}`}
							</Text>
						</ModalBody>
						<ModalFooter className="justify-between gap-2">
							<Button
								size="lg"
								className="flex-1 rounded-full"
								onPress={() => setIsUnansweredModalOpen(false)}
							>
								<ButtonText>{t("common.understood", "Tushundim")}</ButtonText>
							</Button>
						</ModalFooter>
					</ModalContent>
				</Modal>

				<Modal
					isOpen={isExitModalOpen}
					onClose={() => setIsExitModalOpen(false)}
					size="lg"
				>
					<ModalBackdrop className="bg-foreground/20 !backdrop-blur-2xl" />
					<ModalContent className="rounded-[30px] bg-background p-5">
						<ModalBody className="mt-3 text-center mb-5">
							<Image
								className="mx-auto"
								source={require("../../../../../assets/images/alert.webp")}
								alt=""
							/>
							<Divider className="mx-4 my-4" />
							<Heading className="text-center" size="md">
								{t("exam.exit.title", "Exit test")}
							</Heading>

							<Text className="text-base text-center mt-1 text-muted-foreground">
								{t("exam.exit.message", "Do you want to leave?")}
							</Text>
						</ModalBody>
						<ModalFooter className="justify-between gap-2">
							<Button
								size="lg"
								className="rounded-full flex-1"
								variant="outline"
								onPress={() => setIsExitModalOpen(false)}
							>
								<ButtonText>{t("exam.exit.cancel", "Cancel")}</ButtonText>
							</Button>
							<Button
								size="lg"
								className="flex-1 rounded-full bg-foreground"
								onPress={() => {
									setIsExitModalOpen(false);
									router.back();
								}}
							>
								<ButtonText className="text-background">
									{t("exam.exit.confirm", "Exit")}
								</ButtonText>
							</Button>
						</ModalFooter>
					</ModalContent>
				</Modal>
			</Box>
		</BottomSheet>
	);
}
