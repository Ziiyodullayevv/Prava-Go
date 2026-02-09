import React, { useMemo, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Check, ChevronLeft, X } from "lucide-react-native";
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
import { VStack } from "@/components/ui/vstack";
import {
	Avatar,
	AvatarFallbackText,
	AvatarImage,
} from "@/components/ui/avatar";

export default function QuestionResultScreen() {
	const router = useRouter();
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const insets = useSafeAreaInsets();
	const iconColor = isDark ? Colors.dark.text : Colors.light.text;
	const { answers, reset, total } = useQuestionStore();
	const [expandedId, setExpandedId] = useState<number | null>(null);

	const correctCount = useMemo(() => {
		return QUESTIONS.reduce((acc, question) => {
			const selected = answers[question.id];
			if (selected === question.correctIndex) return acc + 1;
			return acc;
		}, 0);
	}, [answers]);

	const percent = Math.round((correctCount / total) * 100);

	const badge =
		percent === 100
			? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80"
			: "https://static.vecteezy.com/system/resources/thumbnails/054/196/825/small/3d-render-award-badge-illustration-png.png";

	const handleDone = () => {
		reset();
		router.replace("/tabs/(questions)");
	};

	return (
		<Box className="flex-1 bg-background">
			<Box className="h-[300px] relative">
				<Box className="pt-safe absolute z-[100] top-0 left-0 right-0">
					<Box className="flex-row items-center px-5 h-14">
						<Button
							onPress={() => router.back()}
							variant="ghost"
							className="bg-card h-14 w-14 rounded-full"
						>
							<ChevronLeft color={iconColor} />
						</Button>
						<Box className="flex-1 items-center">
							<Heading className="text-2xl text-white font-semibold">
								Questions Result
							</Heading>
						</Box>
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
				<Box className="bg-card absolute bottom-12 mx-5 rounded-2xl p-3 shadow-hard-5 flex-row inline-flex items-center gap-4">
					<Box>
						<Box className="flex-row gap-2">
							<Heading
								className={`text-2xl font-semibold ${percent >= 90 ? "text-emerald-500" : "text-rose-500"}`}
							>
								{percent >= 90 ? "Successful!" : "Failed"}
							</Heading>
						</Box>
						<Box className="flex-row items-center gap-0 mt-1">
							<Text className="text-base text-emerald-500">
								{percent}% Points
							</Text>
							<Text>・</Text>
							<Text className="text-base text-primary/80">
								{correctCount}/{total} Correct
							</Text>
						</Box>
					</Box>
					<Box className="w-[80px] justify-center items-center h-[80px] bg-background rounded-xl overflow-hidden">
						<Image
							className="w-[60px] h-[60px] object-cover"
							source={{
								uri: badge,
							}}
						/>
					</Box>
				</Box>
			</Box>

			<ScrollView
				className="flex-1 bg-background rounded-t-[30px] -mt-[30px]"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: insets.bottom + 50 }}
			>
				<Box className="px-5 gap-4 py-5">
					<Box className="gap-3">
						{QUESTIONS.map((question) => {
							const selected = answers[question.id];
							const isCorrect = selected === question.correctIndex;
							const isExpanded = expandedId === question.id;
							return (
								<Box key={question.id} className="gap-2">
									<Pressable
										onPress={() =>
											setExpandedId((prev) =>
												prev === question.id ? null : question.id,
											)
										}
									>
										<Box className="bg-card px-5 py-4 flex-row justify-between items-center rounded-2xl">
											<Box className="flex-1 gap-1 pr-4">
												<Text className="text-sm text-primary/60">
													Question {question.id}
												</Text>
												<Heading
													numberOfLines={1}
													ellipsizeMode="tail"
													className="text-base font-normal"
												>
													{question.question}
												</Heading>
											</Box>
											{isCorrect ? (
												<Box className="w-[28px] h-[28px] rounded-full bg-emerald-500 items-center justify-center">
													<Check size={16} color="#fff" />
												</Box>
											) : (
												<Box className="w-[28px] h-[28px] rounded-full bg-rose-500 items-center justify-center">
													<X size={16} color="#fff" />
												</Box>
											)}
										</Box>
									</Pressable>

									{isExpanded ? (
										<Box className="bg-card/60 rounded-2xl px-4 py-3 gap-2">
											{question.options.map((option, optionIndex) => {
												const isRight = optionIndex === question.correctIndex;
												const isWrong =
													selected === optionIndex &&
													optionIndex !== question.correctIndex;
												const isChosen = selected === optionIndex;
												return (
													<Box
														key={`${question.id}-${option}`}
														className={[
															"px-4 py-3 rounded-xl flex-row items-center justify-between",
															isRight
																? "bg-emerald-500/15"
																: isWrong
																	? "bg-rose-500/15"
																	: "bg-background/50",
														].join(" ")}
													>
														<Text
															numberOfLines={2}
															ellipsizeMode="tail"
															className="text-sm flex-1 pr-3"
														>
															{option}
														</Text>
														{isRight ? (
															<Box className="w-[22px] h-[22px] rounded-full bg-emerald-500 items-center justify-center">
																<Check size={12} color="#fff" />
															</Box>
														) : isWrong ? (
															<Box className="w-[22px] h-[22px] rounded-full bg-rose-500 items-center justify-center">
																<X size={12} color="#fff" />
															</Box>
														) : isChosen ? (
															<Box className="w-[22px] h-[22px] rounded-full border border-primary/30" />
														) : (
															<Box className="w-[22px] h-[22px]" />
														)}
													</Box>
												);
											})}
										</Box>
									) : null}
								</Box>
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
					onPress={handleDone}
					className="h-12 rounded-2xl bg-emerald-500"
				>
					<ButtonText className="text-base font-semibold text-black">
						Done
					</ButtonText>
				</Button>
			</Box>
		</Box>
	);
}
