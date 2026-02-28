import { useCallback, useEffect, useRef, useState } from "react";
import { loadTheoryTopicDetail } from "../api";
import type { TheoryTopicDetail } from "../types";
import {
	getTheoryTopicDetailLangCacheKey,
	peekCache,
	writeCache,
} from "../cache";

export function useTheoryTopicDetail(
	userId?: string | null,
	slug?: string | null,
	language?: string | null,
) {
	const [detail, setDetail] = useState<TheoryTopicDetail | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const hasCachedViewRef = useRef(false);

	const normalizedSlug = (slug ?? "").trim();
	const languageKey = (language ?? "default").trim() || "default";

	useEffect(() => {
		hasCachedViewRef.current = detail !== null;
	}, [detail]);

	const reload = useCallback(async () => {
		if (!userId || !normalizedSlug) {
			setDetail(null);
			setError("");
			setIsLoading(false);
			return;
		}

		setIsLoading(!hasCachedViewRef.current);
		setError("");
		const cacheKey = getTheoryTopicDetailLangCacheKey(
			userId,
			normalizedSlug,
			languageKey,
		);

		try {
			const cached = await peekCache<TheoryTopicDetail>(cacheKey);
			if (cached) {
				setDetail(cached);
				setIsLoading(false);
			}
		} catch {
			// cache read errors are ignored
		}

		try {
			const data = await loadTheoryTopicDetail(userId, normalizedSlug);
			setDetail(data);
			await writeCache(cacheKey, data);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Bo'lim ma'lumotini yuklashda xatolik yuz berdi.";
			setError(message);
			setDetail((prev) => prev);
		} finally {
			setIsLoading(false);
		}
	}, [languageKey, normalizedSlug, userId]);

	useEffect(() => {
		reload().catch(() => {});
	}, [reload]);

	return { detail, isLoading, error, reload };
}
