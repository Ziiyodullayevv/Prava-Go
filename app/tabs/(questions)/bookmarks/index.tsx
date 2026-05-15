import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
	BookmarkPlus,
	BookmarkX,
	ChevronLeft,
	ChevronRight,
	CircleCheck,
} from "lucide-react-native";

import { GradientIconFrame } from "@/components/GradientIconFrame";
import { NetworkErrorState } from "@/components/NetworkErrorState";
import { YandexRippleButton } from "@/components/YandexRippleButton";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import {
	useQuizCategoriesQuery,
	useDeleteQuizSavedQuestionMutation,
	useQuizSavedQuestionsInfiniteQuery,
	type QuizQuestion,
	type QuizSavedQuestion,
} from "@/features/quiz/api";
import { getCategoryTitle } from "@/features/theory/backend-mappers";
import { useI18n } from "@/locales/i18n-provider";

function pickString(...values: unknown[]) {
	return values.find(
		(value): value is string => typeof value === "string" && value.trim().length > 0,
	)?.trim();
}

function getQuestionText(question: QuizQuestion, language: string) {
	if (language.startsWith("ru")) {
		return pickString(question.text_ru, question.text_uzl);
	}

	if (language.includes("Cyrl")) {
		return pickString(question.text_uzk, question.text_uzl);
	}

	return pickString(question.text_uzl, question.text_ru);
}

function SavedQuestionCard({
	item,
	language,
	categoryLabel,
	mutedColor,
	textColor,
	onPress,
	onDelete,
	isDeleting,
	savedLabel,
}: {
	item: QuizSavedQuestion;
	language: string;
	categoryLabel: string;
	mutedColor: string;
	textColor: string;
	onPress: () => void;
	onDelete: () => void;
	isDeleting: boolean;
	savedLabel: string;
}) {
	const title = getQuestionText(item.question, language) ?? "Savol";

	return (
		<Pressable onPress={onPress}>
			<Box className="rounded-3xl bg-card shadow-hard-5 px-4 py-4">
				<Box className="flex-row items-start gap-2">
					<Pressable
						onPress={(event) => {
							event.stopPropagation();
							onDelete();
						}}
						disabled={isDeleting}
					>
						<Box className={isDeleting ? "opacity-50" : ""}>
							<GradientIconFrame>
								<BookmarkPlus size={20} color="#0f8b5f" strokeWidth={1.9} />
							</GradientIconFrame>
						</Box>
					</Pressable>

					<Box className="ml-4 flex-1">
						<Heading
							className="text-sm font-semibold"
							numberOfLines={2}
							ellipsizeMode="tail"
							style={{ color: textColor }}
						>
							{title}
						</Heading>
						<Text
							className="mt-1 text-sm text-foreground/70"
							numberOfLines={1}
						>
							{categoryLabel}
						</Text>

						<Pressable
							className="mt-3 self-start"
							onPress={(event) => {
								event.stopPropagation();
								onDelete();
							}}
							disabled={isDeleting}
						>
							<Box
								className={[
									"flex-row items-center gap-2",
									isDeleting ? "opacity-50" : "",
								].join(" ")}
							>
								<CircleCheck size={18} color="#0f8b5f" />
								<Text className="text-sm text-emerald-700">
									{savedLabel}
								</Text>
							</Box>
						</Pressable>
					</Box>

					<Box className="-mr-1 mt-1">
						<ChevronRight size={22} color={mutedColor} />
					</Box>
				</Box>
			</Box>
		</Pressable>
	);
}

function SavedQuestionSkeleton() {
	return (
		<Box className="rounded-3xl bg-card shadow-hard-5 px-4 py-4">
			<Box className="flex-row items-start gap-2">
				<Skeleton variant="sharp" className="h-10 w-10 rounded-xl" />

				<Box className="ml-4 flex-1">
					<SkeletonText _lines={2} className="h-3" />
					<Skeleton variant="sharp" className="mt-2 h-3 w-4/5 rounded-full" />
					<Box className="mt-3 flex-row items-center gap-2">
						<Skeleton variant="circular" className="h-[18px] w-[18px]" />
						<Skeleton variant="sharp" className="h-3 w-24 rounded-full" />
					</Box>
				</Box>

				<Box className="-mr-1 mt-1">
					<Skeleton variant="sharp" className="h-6 w-4 rounded-full" />
				</Box>
			</Box>
		</Box>
	);
}

type SavedListItem =
	| { type: "skeleton"; id: string }
	| { type: "saved"; item: QuizSavedQuestion };

export default function BookmarksScreen() {
	const router = useRouter();
	const { colorMode } = useAppTheme();
	const { user } = useAuth();
	const { language, t } = useI18n();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;
	const text = isDark ? "#ECEDEE" : "#111111";
	const muted = isDark ? "#b0b0b0" : "#4b4b4b";
	const categoriesQuery = useQuizCategoriesQuery();
	const [isRefreshing, setIsRefreshing] = useState(false);
	const {
		data: savedPages,
		isLoading,
		isFetching,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		error,
		refetch,
	} = useQuizSavedQuestionsInfiniteQuery(Boolean(user?.id));
	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await Promise.all([categoriesQuery.refetch(), refetch()]);
		} finally {
			setIsRefreshing(false);
		}
	}, [categoriesQuery, refetch]);
	const data = useMemo(
		() => savedPages?.pages.flatMap((page) => page.results) ?? [],
		[savedPages],
	);
	const totalSavedCount = savedPages?.pages[0]?.count ?? data.length;
	const deleteSavedMutation = useDeleteQuizSavedQuestionMutation();
	const showSkeleton = (isLoading || isFetching) && data.length === 0;
	const skeletonItems = useMemo(
		() => Array.from({ length: 10 }, (_, index) => `s${index + 1}`),
		[],
	);
	const categoryTitleById = useMemo(() => {
		const titleById = new Map<string, string>();

		for (const category of categoriesQuery.data ?? []) {
			const title = getCategoryTitle(category, language);
			if (title) titleById.set(String(category.id), title);
		}

		return titleById;
	}, [categoriesQuery.data, language]);
	const listData = useMemo<SavedListItem[]>(() => {
		if (showSkeleton) {
			return skeletonItems.map((id) => ({ type: "skeleton", id }));
		}

		return data.map((item) => ({ type: "saved", item }));
	}, [data, showSkeleton, skeletonItems]);
	const errorMessage =
		error instanceof Error
			? error.message
			: error
				? "Saqlangan savollarni yuklashda xatolik yuz berdi."
				: "";
	const savedLabel = t("practice.questions.saved", "Saqlangan");

	return (
		<Box className="flex-1 pt-safe bg-background">
			<Box className="px-4 my-2 flex-row items-center justify-between">
				<Box
					style={{
						elevation: 1,
						shadowColor: "#000",
						shadowOffset: { width: 0, height: 2 },
						shadowOpacity: isDark ? 0.14 : 0.08,
						shadowRadius: 3,
					}}
				>
					<YandexRippleButton
						onPress={() => router.replace("/tabs/(tabs)/home")}
						borderRadius={9999}
					>
						<GradientIconFrame
							size={48}
							borderRadius={999}
							innerBorderRadius={999}
						>
							<ChevronLeft size={24} color={palette.text} />
						</GradientIconFrame>
					</YandexRippleButton>
				</Box>

				<Box className="h-12 flex-1 items-center justify-center px-3">
					<Heading className="text-lg font-semibold" style={{ color: text }}>
						{t("practice.explore.bookmarks.title", "Bookmarks")}
					</Heading>
					<Text
						className="text-sm"
						style={{ color: muted, lineHeight: 18, marginTop: 1 }}
					>
						{totalSavedCount.toLocaleString("en-US")}{" "}
						{t("common.questionsWord", "savol")}
					</Text>
				</Box>

				<GradientIconFrame
					size={48}
					borderRadius={999}
					innerBorderRadius={999}
				>
					<BookmarkPlus size={24} color={palette.text} strokeWidth={1.9} />
				</GradientIconFrame>
			</Box>

			{errorMessage && data.length === 0 && !showSkeleton ? (
					<NetworkErrorState onRetry={handleRefresh} isRetrying={isRefreshing} />
				) : (
					<FlatList
						showsVerticalScrollIndicator={false}
						refreshing={isRefreshing}
						onRefresh={handleRefresh}
						data={listData}
						keyExtractor={(item, index) =>
							item.type === "skeleton"
								? item.id
								: String(item.item.question.id ?? index)
						}
						renderItem={({ item }) =>
							item.type === "skeleton" ? (
								<SavedQuestionSkeleton />
							) : (
								<SavedQuestionCard
									item={item.item}
									language={language}
									categoryLabel={
										categoryTitleById.get(
											String(
												item.item.question.category_id ??
													item.item.question.category ??
													"",
											),
										) ??
										item.item.question.category_name ??
										t("practice.questions.title", "Savollar")
									}
									mutedColor={muted}
									textColor={text}
									isDeleting={deleteSavedMutation.isPending}
									savedLabel={savedLabel}
									onPress={() =>
										router.push({
											pathname: "/tabs/(questions)/questions/[questionId]",
											params: { questionId: String(item.item.question.id) },
										})
									}
									onDelete={() =>
										deleteSavedMutation.mutate(item.item.question.id)
									}
								/>
							)
						}
						ItemSeparatorComponent={() => <Box className="h-3" />}
						onEndReached={() => {
							if (hasNextPage && !isFetchingNextPage) {
								fetchNextPage();
							}
						}}
						onEndReachedThreshold={0.45}
						ListFooterComponent={
							isFetchingNextPage ? (
								<Box className="py-4">
									<SavedQuestionSkeleton />
								</Box>
							) : null
						}
						ListEmptyComponent={
							showSkeleton ? null : (
								<Box className="flex-1 items-center justify-center py-24">
									<BookmarkX size={64} color={muted} strokeWidth={1.3} />
									<Text className="mt-4 text-base text-center" style={{ color: muted }}>
										{t("practice.bookmarks.empty", "Saqlangan savollar yo'q.")}
									</Text>
								</Box>
							)
						}
						contentContainerStyle={{
							paddingHorizontal: 12,
							paddingTop: 16,
							paddingBottom: 24,
							flexGrow: 1,
						}}
					/>
				)}
		</Box>
	);
}
