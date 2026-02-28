import React, { useEffect, useMemo } from "react";
import { Pressable, ScrollView, type DimensionValue } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, RotateCcw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Colors } from "@/constants/Colors";
import { useQuestionStore } from "../question-context";
import { useAppTheme } from "@/contexts/theme-context";
import { useI18n } from "@/locales/i18n-provider";

function clamp(n: number, min: number, max: number) {
	return Math.min(max, Math.max(min, n));
}

export default function QuestionResultScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { colorMode } = useAppTheme();
	const { t } = useI18n();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;

	const {
		reset,
		total,
		startedAt,
		finishReason,
		answeredCount,
		correctCount,
		wrongCount,
	} = useQuestionStore();

	useEffect(() => {
		if (startedAt || answeredCount > 0) return;
		router.replace("/tabs/(tabs)/practice");
	}, [answeredCount, router, startedAt]);

	const safeTotal = Math.max(1, total);
	const percent = Math.round((correctCount / safeTotal) * 100);
	const passMark = Math.round(((safeTotal - 2) / safeTotal) * 100);
	const passed = wrongCount <= 2 && finishReason !== "timeout";
	const isTimeout = finishReason === "timeout";

	const passMarkOffset = useMemo<DimensionValue>(
		() => `${clamp(passMark, 0, 100)}%`,
		[passMark],
	);
	const scoreWidth = useMemo<DimensionValue>(
		() => `${clamp(percent, 0, 100)}%`,
		[percent],
	);

	const restartTest = () => {
		reset();
		router.replace("/tabs/(questions)/exam");
	};

	const reviewAnswers = () => {
		router.back();
	};

	const statusImage = passed
		? require("../../../../assets/images/status/status-success-2.png")
		: require("../../../../assets/images/status/status-mistake-2.png");

	return (
		<Box className="flex-1 bg-background pt-safe">
			<Box className="px-4 my-2 flex-row items-center justify-between">
				<Pressable onPress={reviewAnswers}>
					<Box className="h-12 w-12 rounded-full items-center shadow-hard-5 justify-center bg-card">
						<ChevronLeft size={24} color={palette.text} />
					</Box>
				</Pressable>

				<Heading className="text-lg font-semibold">
					{t("common.results", "Results")}
				</Heading>

				<Pressable onPress={restartTest}>
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
							{t("common.practicePassMark", "PRACTICE PASS MARK")}: {passMark}%
						</Text>

						<Text className="mt-1 text-center text-sm text-muted-foreground">
							{t("common.correct", "Correct")}: {correctCount}/{safeTotal} |{" "}
							{t("common.answered", "Answered")}: {answeredCount}/{safeTotal}
						</Text>
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
						onPress={restartTest}
					>
						<ButtonText className="text-base font-semibold text-primary-foreground">
							{t("common.nextTest", "Next test")}
						</ButtonText>
					</Button>
				</Box>
			</Box>
		</Box>
	);
}
