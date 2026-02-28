import React, { useRef, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
	ChevronLeft,
	ChevronRight,
	CircleHelp,
	CircleX,
	Clock3,
	Crown,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { CustomSwitch } from "@/components/CustomSwitch";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/auth-context";
import { useAppTheme } from "@/contexts/theme-context";
import { createMockExamSession } from "@/features/theory/api";
import { useAutoAdvance } from "@/hooks/useAutoAdvance";
import { useI18n } from "@/locales/i18n-provider";

const QUESTIONS_COUNT = 20;
const DURATION_MINUTES = 25;
const MAX_MISTAKES = 2;

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
		<Box className="h-14 flex-row items-center justify-between border-b border-foreground/10">
			<Text className="text-base font-normal">{label}</Text>
			<Text className="text-sm font-semibold text-muted-foreground">
				{value}
			</Text>
		</Box>
	);
}

export default function MockExamIntroScreen() {
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
	const params = useLocalSearchParams<{ slug?: string; title?: string }>();
	const slug = params.slug ?? "mock-exam";
	const title = params.title ?? "Driving Mock Exam";
	const {
		value: autoAdvance,
		setValue: setAutoAdvance,
		isReady: isAutoAdvanceReady,
	} = useAutoAdvance(slug);

	const isStartingRef = useRef(false);
	const [startError, setStartError] = useState("");
	const [isStarting, setIsStarting] = useState(false);

	const handleStartMock = async () => {
		if (isStartingRef.current) return;
		if (!user?.id) {
			setStartError(t("common.error", "Something went wrong."));
			return;
		}
		isStartingRef.current = true;
		setStartError("");
		setIsStarting(true);
		try {
			const { sessionId } = await createMockExamSession({
				userId: user.id,
				questionLimit: QUESTIONS_COUNT,
				settings: {
					showMistakesOnly: false,
					shuffleQuestions: true,
					autoAdvance,
				},
			});

			router.replace({
				pathname: "/tabs/(questions)/theory/test/[sessionId]",
				params: {
					sessionId,
				},
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
						Mock Exam
					</Heading>
					<Text className="text-sm" style={{ color: muted }}>
						Timed • No hints
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
						className="self-center mt-4 w-[230px] h-[230px]"
						source={require("../../../../assets/images/exam/exam-banner-2.webp")}
						alt={title}
						resizeMode="contain"
					/>

					<Heading
						numberOfLines={2}
						ellipsizeMode="tail"
						className="mt-1 text-center text-3xl font-semibold"
						style={{ color: text }}
					>
						{title}
					</Heading>
				</Box>

				<Box className="mt-6 rounded-t-[34px] h-full bg-card px-4 pt-5 pb-7">
					<Text className="text-sm uppercase tracking-wide text-muted-foreground">
						Mock exam info
					</Text>

					<Box className="rounded-2xl py-4">
						<Box className="flex-row items-center">
							<StatItem
								label="Questions"
								value={String(QUESTIONS_COUNT)}
								icon={CircleHelp}
								iconColor={palette.tabIconDefault}
							/>
							<Box className="mx-2 h-16 w-[1px] bg-border/70" />
							<StatItem
								label="Minutes"
								value={String(DURATION_MINUTES)}
								icon={Clock3}
								iconColor={palette.tint}
							/>
							<Box className="mx-2 h-16 w-[1px] bg-border/70" />
							<StatItem
								label="Max mistakes"
								value={String(MAX_MISTAKES)}
								icon={CircleX}
								iconColor={palette.tabIconDefault}
							/>
						</Box>
					</Box>

					<Text className="text-sm uppercase tracking-wide text-muted-foreground">
						Exam settings
					</Text>

					<Box className="mt-3 rounded-3xl bg-background px-4">
						{isAutoAdvanceReady ? (
							<Pressable onPress={() => setAutoAdvance(!autoAdvance)}>
								<Box className="h-14 flex-row items-center justify-between border-b border-foreground/10">
									<Text className="text-base font-normal">
										Auto-advance to next question
									</Text>
									<CustomSwitch
										value={autoAdvance}
										onValueChange={setAutoAdvance}
									/>
								</Box>
							</Pressable>
						) : null}

						<InfoRow label="Question order" value="Randomized" />
						<InfoRow label="Hints" value="Disabled" />

						<Box className="h-14 flex-row items-center justify-between">
							<Text className="text-base font-normal">Timer</Text>
							<Text className="text-sm font-semibold text-muted-foreground">
								25:00
							</Text>
						</Box>
					</Box>
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
						onPress={handleStartMock}
						disabled={isStarting}
					>
						{isStarting ? (
							<ButtonSpinner color={primaryForegroundColor} />
						) : null}
						<ButtonText className="text-base font-semibold text-primary-foreground">
							{isStarting ? "Starting..." : "Start Mock"}
						</ButtonText>
					</Button>
				</Box>
			</Box>
		);
}
