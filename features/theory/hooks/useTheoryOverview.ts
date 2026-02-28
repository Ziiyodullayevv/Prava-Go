import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import { EMPTY_OVERVIEW, loadTheoryOverview } from "../api";
import type { TheoryOverview } from "../types";
import {
	getTheoryOverviewLangCacheKey,
	peekCache,
	peekMemoryCache,
	writeCache,
} from "../cache";

export function useTheoryOverview(
	userId?: string | null,
	language?: string | null,
) {
	const languageKey = (language ?? "default").trim() || "default";
	const initialCacheKey = userId
		? getTheoryOverviewLangCacheKey(userId, languageKey)
		: "";
	const initialMemoryCached = initialCacheKey
		? peekMemoryCache<TheoryOverview>(initialCacheKey)
		: null;
	const [overview, setOverview] = useState<TheoryOverview>(
		() => initialMemoryCached ?? EMPTY_OVERVIEW,
	);
	const [isLoading, setIsLoading] = useState(
		() => Boolean(userId) && !initialMemoryCached,
	);
	const [error, setError] = useState("");
	const hasCachedViewRef = useRef(
		(initialMemoryCached?.topics.length ?? 0) > 0,
	);

	useEffect(() => {
		hasCachedViewRef.current = overview.topics.length > 0;
	}, [overview.topics.length]);

	useEffect(() => {
		if (!userId) return;
		const cacheKey = getTheoryOverviewLangCacheKey(userId, languageKey);
		const memoryCached = peekMemoryCache<TheoryOverview>(cacheKey);
		if (!memoryCached) return;
		setOverview(memoryCached);
		hasCachedViewRef.current = memoryCached.topics.length > 0;
		setIsLoading(false);
	}, [languageKey, userId]);

	const reload = useCallback(async () => {
		if (!userId) {
			setOverview(EMPTY_OVERVIEW);
			setError("");
			setIsLoading(false);
			return;
		}

		const cacheKey = getTheoryOverviewLangCacheKey(userId, languageKey);
		const memoryCached = peekMemoryCache<TheoryOverview>(cacheKey);
		if (memoryCached) {
			setOverview(memoryCached);
			hasCachedViewRef.current = memoryCached.topics.length > 0;
		}

		setIsLoading(!hasCachedViewRef.current && !memoryCached);
		setError("");

		try {
			const cached = memoryCached ?? (await peekCache<TheoryOverview>(cacheKey));
			if (cached) {
				setOverview(cached);
				setIsLoading(false);
			}
		} catch {
			// cache read errors are ignored
		}

		try {
			const data = await loadTheoryOverview(userId);
			setOverview(data);
			await writeCache(cacheKey, data);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Bo'limlarni yuklashda xatolik yuz berdi.";
			setError(message);
			setOverview((prev) => (prev.topics.length > 0 ? prev : EMPTY_OVERVIEW));
		} finally {
			setIsLoading(false);
		}
	}, [languageKey, userId]);

	useEffect(() => {
		const task = InteractionManager.runAfterInteractions(() => {
			reload().catch(() => {});
		});

		return () => {
			task.cancel();
		};
	}, [reload]);

	return {
		overview,
		summary: overview.summary,
		topics: overview.topics,
		isLoading,
		error,
		reload,
	};
}
