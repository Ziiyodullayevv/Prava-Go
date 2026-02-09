import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Check } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Colors } from "@/constants/Colors";
import { QUESTIONS } from "@/data/questions";
import { useQuestionStore } from "./question-context";
import { useAppTheme } from "@/contexts/theme-context";

function clamp(n: number, min: number, max: number) {
	return Math.min(max, Math.max(min, n));
}

export default function QuestionDetailsScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string }>();
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const insets = useSafeAreaInsets();
	const iconColor = isDark ? Colors.dark.text : Colors.light.text;
	const { answers, setAnswer, total } = useQuestionStore();

	const startIndex = useMemo(() => {
		const parsed = Number(params.id);
		if (!Number.isFinite(parsed)) return 1;
		return clamp(parsed, 1, total);
	}, [params.id, total]);

	const [currentIndex, setCurrentIndex] = useState(startIndex);

	useEffect(() => {
		setCurrentIndex(startIndex);
	}, [startIndex]);

	const questionData = QUESTIONS[currentIndex - 1] ?? QUESTIONS[0];
	const questionId = questionData.id;
	const selectedIndex = answers[questionId];

	const canNext = currentIndex < total;
	const canContinue = selectedIndex !== undefined;

	const handleContinue = () => {
		if (!canContinue) return;
		if (canNext) {
			setCurrentIndex((prev) => Math.min(total, prev + 1));
			return;
		}
		router.replace("/tabs/(questions)/result");
	};

	return (
		<Box className="flex-1 bg-background">
			<Box className="h-[300px] relative">
				<Box className="pt-safe absolute z-[100] top-0 left-0 right-0">
					<Box className="flex-row items-center px-5 h-14">
						<Button
							onPress={() => router.back()}
							variant="ghost"
							className="bg-card/30 h-14 w-14 rounded-full"
						>
							<ChevronLeft color={iconColor} />
						</Button>

						<Box className="w-14" />
					</Box>
				</Box>
				<Image
					alt="image"
					className="object-cover w-full h-full"
					source={{
						uri: "https://media.architecturaldigest.com/photos/6679b599132b6a297f93f7ff/master/w_1600%2Cc_limit/EMBARGO-BUGATTI-World-Premiere-Presskit-Images-02.jpg",
					}}
				/>
				<Box className="absolute bottom-0 w-full h-20 bg-gradient-to-t from-background to-transparent" />
			</Box>

			<ScrollView
				className="flex-1 bg-background rounded-t-[30px] -mt-[30px]"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
			>
				<Box className="px-5 my-5">
					<Box className="bg-card self-center w-full rounded-3xl px-5 py-4">
						<Text className="self-center px-3 py-1 rounded-full bg-background/70 text-sm text-primary/70">
							Question {questionId}/{total}
						</Text>
						<Heading className="text-xl mt-3 font-semibold">
							{questionData.question}
						</Heading>
					</Box>

					<Box className="gap-3 mt-4">
						{questionData.options.map((option, optionIndex) => {
							const isSelected = selectedIndex === optionIndex;
							return (
								<Pressable
									key={option}
									onPress={() => setAnswer(questionId, optionIndex)}
								>
									<Box
										className={[
											"bg-card px-5 py-4 flex-row justify-between items-center rounded-2xl",
											isSelected
												? "border border-emerald-500/30"
												: "border border-transparent",
										].join(" ")}
									>
										<Text
											numberOfLines={2}
											ellipsizeMode="tail"
											className="text-base flex-1 pr-4"
										>
											{option}
										</Text>
										{isSelected ? (
											<Box className="w-[24px] h-[24px] rounded-full bg-emerald-500 items-center justify-center">
												<Check size={14} color="#fff" />
											</Box>
										) : (
											<Box className="w-[24px] h-[24px] rounded-full border border-primary/30" />
										)}
									</Box>
								</Pressable>
							);
						})}
					</Box>
				</Box>
			</ScrollView>

			<Box
				className="absolute left-0 right-0 bottom-0 px-5 pt-3 bg-background border-t border-border/30"
				style={{ paddingBottom: Math.max(insets.bottom, 12) }}
			>
				<Button
					onPress={handleContinue}
					disabled={!canContinue}
					className={[
						"h-12 rounded-2xl",
						canContinue ? "bg-emerald-500" : "bg-emerald-500/40",
					].join(" ")}
				>
					<ButtonText className="text-base font-semibold text-black">
						{canNext ? "Continue" : "Finish"}
					</ButtonText>
				</Button>
			</Box>
		</Box>
	);
}
