import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react-native";
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
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Image } from "@/components/ui/image";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/auth-context";
import { useAppTheme } from "@/contexts/theme-context";
import {
	loadBookmarkedQuestions,
	type BookmarkedQuestion,
} from "@/features/theory/bookmarks";
import { useI18n } from "@/locales/i18n-provider";

export default function BookmarksScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { user } = useAuth();
	const { colorMode } = useAppTheme();
	const { language, t } = useI18n();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;
	const [questions, setQuestions] = useState<BookmarkedQuestion[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	const reload = useCallback(async () => {
		if (!user?.id) {
			setQuestions([]);
			setError("");
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setError("");
		try {
			const data = await loadBookmarkedQuestions(user.id, language);
			setQuestions(data);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: t("common.error", "Something went wrong.");
			setError(message);
			setQuestions([]);
		} finally {
			setIsLoading(false);
		}
	}, [language, t, user?.id]);

	useFocusEffect(
		useCallback(() => {
			reload().catch(() => {});
		}, [reload]),
	);

	const savedCountText = useMemo(
		() => `${questions.length} ${t("common.questionsWord", "questions")}`,
		[questions.length, t],
	);

	return (
		<Box className="flex-1 bg-background pt-safe">
			<Box className="px-4 my-2 flex-row items-center justify-between">
				<Pressable onPress={() => router.back()}>
					<Box className="h-12 w-12 rounded-full items-center shadow-hard-5 justify-center bg-card">
						<ChevronLeft size={24} color={palette.text} />
					</Box>
				</Pressable>

				<Heading className="text-lg font-semibold">
					{t("practice.explore.bookmarks.title", "Bookmarks")}
				</Heading>

				<Box className="h-12 w-12 rounded-full bg-card items-center justify-center shadow-hard-5">
					<Bookmark size={22} color={palette.text} />
				</Box>
			</Box>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					paddingBottom: Math.max(insets.bottom, 12) + 24,
				}}
			>
				<Box className="mx-4 mt-3 rounded-3xl bg-card px-4 py-4">
					<Text className="text-sm text-muted-foreground">
						{t(
							"practice.explore.bookmarks.description",
							"Revisit your saved questions",
						)}
					</Text>
					<Heading className="mt-2 text-2xl font-semibold">
						{savedCountText}
					</Heading>
				</Box>

				{error ? (
					<Box className="mx-4 mt-3 rounded-2xl bg-card px-3 py-3 border border-destructive/30">
						<Text className="text-xs text-destructive">{error}</Text>
						<Pressable className="mt-2" onPress={() => reload()}>
							<Text className="text-sm font-semibold text-primary">
								{t("common.retry", "Retry")}
							</Text>
						</Pressable>
					</Box>
				) : null}

				{isLoading ? (
					<Text className="mx-4 mt-4 text-sm text-muted-foreground">
						{t("common.loading", "Loading...")}
					</Text>
				) : questions.length === 0 ? (
					<Box className="mx-4 mt-4 rounded-3xl bg-card px-4 py-5">
						<Text className="text-sm text-foreground/70">
							{t(
								"practice.bookmarks.empty",
								"Saqlangan savollar topilmadi.",
							)}
						</Text>
					</Box>
				) : (
					<Accordion
						type="single"
						isCollapsible
						isDisabled={false}
						className="w-full"
					>
						{questions.map((question, questionIndex) => (
							<AccordionItem
								key={question.questionId}
								value={question.questionId}
								className="mt-3 rounded-3xl mx-4 bg-card px-3 shadow-md/20"
							>
								<AccordionHeader className="py-3">
									<AccordionTrigger className="gap-0">
										<Box className="flex-row items-start">
											<Box className="h-[40px] w-[40px] rounded-full bg-background items-center justify-center">
												<Text className="text-sm font-semibold text-foreground">
													{questionIndex + 1}
												</Text>
											</Box>

											<Box className="ml-2 flex-1">
												<AccordionTitleText className="text-base font-semibold leading-6 text-foreground">
													{question.prompt}
												</AccordionTitleText>
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
										<Box className="rounded-2xl overflow-hidden border border-border/40 bg-background">
											<Image
												source={{ uri: question.imageUrl }}
												alt={question.prompt}
												className="w-full h-[190px]"
												resizeMode="contain"
											/>
										</Box>
									) : null}

									<Box className="mt-3 gap-2">
										{question.options.map((option, optionIndex) => (
											<Box
												key={option.id}
												className={[
													"rounded-2xl border px-3 py-3",
													option.isCorrect
														? "border-brand bg-brand/15"
														: "border-border bg-background",
												].join(" ")}
											>
												<Text className="text-sm font-medium text-foreground">
													{`F${optionIndex + 1}. ${option.text}`}
												</Text>
												{option.isCorrect ? (
													<Text className="mt-1 text-xs text-brand">
														{t(
															"theory.review.correctAnswer",
															"To'g'ri javob",
														)}
													</Text>
												) : null}
											</Box>
										))}
									</Box>

									{question.explanation ? (
										<Text className="mt-3 text-sm text-muted-foreground">
											{question.explanation}
										</Text>
									) : null}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				)}
			</ScrollView>
		</Box>
	);
}
