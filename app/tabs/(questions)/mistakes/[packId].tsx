import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
	ChevronLeft,
	CircleHelp,
	Clock3,
	CircleOff,
	Crown,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { CustomSwitch } from "@/components/CustomSwitch";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/auth-context";
import { useAppTheme } from "@/contexts/theme-context";
import {
	createMistakePracticeSession,
	loadMistakeQuestionPacks,
} from "@/features/theory/api";
import { MIN_TEST_SECONDS, SECONDS_PER_QUESTION } from "@/features/theory/constants";
import type { MistakeQuestionPack } from "@/features/theory/types";
import { useAutoAdvance } from "@/hooks/useAutoAdvance";
import { useI18n } from "@/locales/i18n-provider";

const PASS_MARK = 80;

type StatItemProps = {
	label: string;
	value: string;
	icon: React.ComponentType<{
		size?: number;
		color?: string;
		strokeWidth?: number;
	}>;
	iconColor: string;
};

function formatTimer(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	return `${String(minutes).padStart(2, "0")}:00`;
}

function StatItem({ label, value, icon, iconColor }: StatItemProps) {
	const StatIcon = icon;

	return (
		<Box className="flex-1">
			<Box className="flex-row items-center gap-2">
				<StatIcon size={16} color={iconColor} strokeWidth={2} />
				<Text className="text-sm text-muted-foreground">{label}</Text>
			</Box>
			<Heading className="mt-1 text-3xl font-semibold">{value}</Heading>
		</Box>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<Box className="min-h-14 py-3 flex-row items-start justify-between gap-3 border-b border-foreground/10">
			<Text className="text-base font-normal flex-1">{label}</Text>
			<Text className="text-sm text-right font-semibold text-muted-foreground shrink-0">
				{value}
			</Text>
		</Box>
	);
}

export default function MistakePackDetailsScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { user } = useAuth();
	const { t } = useI18n();
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;
	const text = isDark ? "#ECEDEE" : "#111111";
	const muted = isDark ? "#b0b0b0" : "#4b4b4b";
	const primaryForegroundColor = isDark ? "#171717" : "#FAFAFA";
	const params = useLocalSearchParams<{ packId?: string }>();
	const packId = typeof params.packId === "string" ? params.packId : "";
	const {
		value: autoAdvance,
		setValue: setAutoAdvance,
		isReady: isAutoAdvanceReady,
	} = useAutoAdvance("mistakes-practice");

	const isStartingRef = useRef(false);
	const [pack, setPack] = useState<MistakeQuestionPack | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [startError, setStartError] = useState("");
	const [isStarting, setIsStarting] = useState(false);

	const reload = useCallback(async () => {
		if (!user?.id || !packId) {
			setPack(null);
			setLoadError("");
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setLoadError("");
		try {
			const data = await loadMistakeQuestionPacks(user.id);
			const matched = data.packs.find((item) => item.id === packId) ?? null;
			setPack(matched);
			if (!matched) {
				setLoadError(
					t(
						"practice.mistakes.packNotFound",
						"Bu bo'limdagi xato savollar tugagan yoki topilmadi.",
					),
				);
			}
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: t("common.error", "Something went wrong.");
			setLoadError(message);
			setPack(null);
		} finally {
			setIsLoading(false);
		}
	}, [packId, t, user?.id]);

	useFocusEffect(
		useCallback(() => {
			reload().catch(() => {});
		}, [reload]),
	);

	const durationSeconds = useMemo(() => {
		const questionCount = pack?.totalQuestions ?? 0;
		return Math.max(MIN_TEST_SECONDS, questionCount * SECONDS_PER_QUESTION);
	}, [pack?.totalQuestions]);

	const handleStart = async () => {
		if (!pack || isStartingRef.current) return;
		if (!user?.id) {
			setStartError(t("common.error", "Something went wrong."));
			return;
		}

		isStartingRef.current = true;
		setStartError("");
		setIsStarting(true);

		try {
			const { sessionId } = await createMistakePracticeSession({
				userId: user.id,
				questionIds: pack.questionIds,
				settings: {
					showMistakesOnly: false,
					shuffleQuestions: true,
					autoAdvance,
				},
			});

			router.replace({
				pathname: "/tabs/(questions)/theory/test/[sessionId]",
				params: { sessionId },
			});
			isStartingRef.current = false;
			setIsStarting(false);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: t("common.error", "Something went wrong.");
			setStartError(message);
			isStartingRef.current = false;
			setIsStarting(false);
		}
	};

	if (isLoading) {
		return (
			<Box className="flex-1 bg-background items-center justify-center px-6">
				<Heading className="text-2xl font-semibold text-center">
					{t("common.loading", "Loading...")}
				</Heading>
			</Box>
		);
	}

	return (
		<Box className="flex-1 pt-safe bg-background">
			<Box className="px-4 my-2 flex-row items-center justify-between">
				<Pressable onPress={() => router.back()}>
					<Box className="h-12 w-12 rounded-full items-center shadow-hard-5 justify-center bg-card">
						<ChevronLeft size={24} color={palette.text} />
					</Box>
				</Pressable>

				<Box className="flex-1 items-center px-2">
					<Heading className="text-lg font-semibold" style={{ color: text }}>
						{t("practice.explore.mistakes.title", "Mistakes")}
					</Heading>
					<Text className="text-sm text-center" style={{ color: muted }}>
						{t("practice.mistakes.shortSubtitle", "Faqat xato savollar")}
					</Text>
				</Box>

				<Button
					variant="ghost"
					className="h-11 w-11 bg-card shadow-hard-1 rounded-full"
				>
					<Crown size={24} color={palette.text} />
				</Button>
			</Box>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					paddingBottom: Math.max(insets.bottom, 12) + 112,
				}}
			>
				<Box className="pt-1">
					<Image
						className="self-center mt-4 w-[210px] h-[210px]"
						source={require("../../../../assets/images/status/status-mistake-2.png")}
						alt={t("practice.explore.mistakes.title", "Mistakes")}
						resizeMode="contain"
					/>

					<Heading
						numberOfLines={2}
						ellipsizeMode="tail"
						className="mt-1 text-center text-3xl font-semibold"
						style={{ color: text }}
					>
						{`${t("practice.mistakes.packTitle", "Xatolar to'plami")} ${packId}`}
					</Heading>
				</Box>

				<Box className="mt-6 rounded-t-[34px] h-full bg-card px-4 pt-5 pb-7">
					<Text className="text-sm uppercase tracking-wide text-muted-foreground">
						{t("practice.mistakes.info", "Test ma'lumotlari")}
					</Text>

					<Box className="rounded-2xl py-4">
						<Box className="flex-row items-center">
							<StatItem
								label={t("theory.questions", "Questions")}
								value={String(pack?.totalQuestions ?? 0)}
								icon={CircleHelp}
								iconColor={palette.tabIconDefault}
							/>
							<Box className="mx-2 h-16 w-[1px] bg-border/70" />
							<StatItem
								label={t("practice.minutes", "Minutes")}
								value={String(Math.floor(durationSeconds / 60))}
								icon={Clock3}
								iconColor={palette.tint}
							/>
							<Box className="mx-2 h-16 w-[1px] bg-border/70" />
							<StatItem
								label={t("practice.passMark", "Pass mark")}
								value={`${PASS_MARK}%`}
								icon={CircleOff}
								iconColor={palette.tabIconDefault}
							/>
						</Box>
					</Box>

					<Text className="mt-5 text-sm uppercase tracking-wide text-muted-foreground">
						{t("theory.testOptions", "Test settings")}
					</Text>

					<Box className="mt-3 rounded-3xl bg-background px-4">
						{isAutoAdvanceReady ? (
							<Pressable onPress={() => setAutoAdvance(!autoAdvance)}>
								<Box className="min-h-14 py-3 flex-row items-start justify-between gap-3 border-b border-foreground/10">
									<Text className="text-base font-normal flex-1">
										{t(
											"theory.settings.autoAdvance",
											"Auto-advance to next question",
										)}
									</Text>
									<CustomSwitch
										value={autoAdvance}
										onValueChange={setAutoAdvance}
									/>
								</Box>
							</Pressable>
						) : null}

						<InfoRow
							label={t("practice.questionOrder", "Question order")}
							value={t("practice.questionOrderRandom", "Randomized")}
						/>

						<Box className="h-14 flex-row items-center justify-between">
							<Text className="text-base font-normal">
								{t("practice.timer", "Timer")}
							</Text>
							<Text className="text-sm font-semibold text-muted-foreground">
								{formatTimer(durationSeconds)}
							</Text>
						</Box>
					</Box>

					{loadError ? (
						<Text className="mt-3 text-sm text-destructive">{loadError}</Text>
					) : null}
				</Box>
			</ScrollView>

			<Box
				className="absolute left-0 right-0 bottom-0 px-4 pt-3 bg-card border-t border-border/40"
				style={{ paddingBottom: Math.max(insets.bottom, 12) }}
			>
				{startError ? (
					<Text className="mb-2 text-sm text-destructive">{startError}</Text>
				) : null}
				<Button
					className="h-14 rounded-2xl bg-primary"
					onPress={handleStart}
					disabled={isStarting || !pack}
				>
					{isStarting ? (
						<ButtonSpinner color={primaryForegroundColor} />
					) : null}
					<ButtonText className="text-base font-semibold text-primary-foreground">
						{isStarting
							? t("common.starting", "Starting...")
							: t("practice.mistakesStart", "Xatolar testini boshlash")}
					</ButtonText>
				</Button>
			</Box>
		</Box>
	);
}
