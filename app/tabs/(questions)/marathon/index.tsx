import React, { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
	ChevronLeft,
	CircleHelp,
	Clock3,
	Flag,
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
import { createMarathonSession } from "@/features/theory/api";
import { useAutoAdvance } from "@/hooks/useAutoAdvance";
import { useI18n } from "@/locales/i18n-provider";

const PASS_MARK = 80;
const MARATHON_OPTIONS = [
	{ id: "marathon-50", questionCount: 50, durationMinutes: 60 },
	{ id: "marathon-100", questionCount: 100, durationMinutes: 120 },
	{ id: "marathon-150", questionCount: 150, durationMinutes: 180 },
] as const;

type MarathonOptionId = (typeof MARATHON_OPTIONS)[number]["id"];

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

function formatTimer(minutes: number) {
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

type MarathonOptionRowProps = {
	label: string;
	description: string;
	isSelected: boolean;
	isLast: boolean;
	onPress: () => void;
	onSwitchChange: (next: boolean) => void;
};

function MarathonOptionRow({
	label,
	description,
	isSelected,
	isLast,
	onPress,
	onSwitchChange,
}: MarathonOptionRowProps) {
	return (
		<Pressable onPress={onPress}>
			<Box
				className={[
					"min-h-16 py-2 flex-row items-center justify-between",
					isLast ? "" : "border-b border-foreground/10",
				].join(" ")}
			>
				<Box className="flex-1 pr-3">
					<Text className="text-base font-normal">{label}</Text>
					<Text className="text-xs text-muted-foreground mt-0.5">
						{description}
					</Text>
				</Box>
				<CustomSwitch value={isSelected} onValueChange={onSwitchChange} />
			</Box>
		</Pressable>
	);
}

export default function MarathonIntroScreen() {
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
	const {
		value: autoAdvance,
		setValue: setAutoAdvance,
		isReady: isAutoAdvanceReady,
	} = useAutoAdvance("marathon");

	const isStartingRef = useRef(false);
	const [selectedOptionId, setSelectedOptionId] = useState<MarathonOptionId>(
		MARATHON_OPTIONS[0].id,
	);
	const [startError, setStartError] = useState("");
	const [isStarting, setIsStarting] = useState(false);

	const selectedOption = useMemo(
		() =>
			MARATHON_OPTIONS.find((option) => option.id === selectedOptionId) ??
			MARATHON_OPTIONS[0],
		[selectedOptionId],
	);

	const handleStartMarathon = async () => {
		if (isStartingRef.current) return;
		if (!user?.id) {
			setStartError(t("common.error", "Something went wrong."));
			return;
		}
		isStartingRef.current = true;
		setStartError("");
		setIsStarting(true);

		try {
			const { sessionId } = await createMarathonSession({
				userId: user.id,
				questionLimit: selectedOption.questionCount,
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
						{t("practice.explore.marathon.title", "Marathon")}
					</Heading>
					<Text className="text-sm text-center" style={{ color: muted }}>
						{t("practice.marathon.shortSubtitle", "50-150 savol")}
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
						source={require("../../../../assets/images/practice/medal.webp")}
						alt={t("practice.explore.marathon.title", "Marathon")}
						resizeMode="contain"
					/>

					<Heading
						numberOfLines={2}
						ellipsizeMode="tail"
						className="mt-1 text-center text-3xl font-semibold"
						style={{ color: text }}
					>
						{t("practice.explore.marathon.title", "Marathon")}
					</Heading>
				</Box>

				<Box className="mt-6 rounded-t-[34px] h-full bg-card px-4 pt-5 pb-7">
					<Text className="text-sm uppercase tracking-wide text-muted-foreground">
						{t("practice.marathonInfo", "Marathon info")}
					</Text>

					<Box className="rounded-2xl py-4">
						<Box className="flex-row items-center">
							<StatItem
								label={t("theory.questions", "Questions")}
								value={String(selectedOption.questionCount)}
								icon={CircleHelp}
								iconColor={palette.tabIconDefault}
							/>
							<Box className="mx-2 h-16 w-[1px] bg-border/70" />
							<StatItem
								label={t("practice.minutes", "Minutes")}
								value={String(selectedOption.durationMinutes)}
								icon={Clock3}
								iconColor={palette.tint}
							/>
							<Box className="mx-2 h-16 w-[1px] bg-border/70" />
							<StatItem
								label={t("practice.passMark", "Pass mark")}
								value={`${PASS_MARK}%`}
								icon={Flag}
								iconColor={palette.tabIconDefault}
							/>
						</Box>
					</Box>

					<Text className="text-sm uppercase tracking-wide text-muted-foreground">
						{t("practice.marathonOptions", "Marathon options")}
					</Text>

					<Box className="mt-3 rounded-3xl bg-background px-4">
						{MARATHON_OPTIONS.map((option, index) => (
							<MarathonOptionRow
								key={option.id}
								label={t(
									`practice.marathon.option.${option.questionCount}`,
									`${option.questionCount}-question marathon`,
								)}
								description={t(
									`practice.marathon.option.${option.questionCount}.time`,
									`${option.durationMinutes} minutes`,
								)}
								isSelected={selectedOptionId === option.id}
								isLast={index === MARATHON_OPTIONS.length - 1}
								onPress={() => setSelectedOptionId(option.id)}
								onSwitchChange={(next) => {
									if (next) {
										setSelectedOptionId(option.id);
									}
								}}
							/>
						))}
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
								{formatTimer(selectedOption.durationMinutes)}
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
					onPress={handleStartMarathon}
					disabled={isStarting}
				>
					{isStarting ? (
						<ButtonSpinner color={primaryForegroundColor} />
					) : null}
					<ButtonText className="text-base font-semibold text-primary-foreground">
						{isStarting
							? t("common.starting", "Starting...")
							: t("practice.marathonStart", "Start marathon")}
					</ButtonText>
				</Button>
			</Box>
		</Box>
	);
}
