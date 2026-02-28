import { useCallback, useEffect, useRef, useState } from "react";
import { loadTheorySession } from "../api";
import type { TheorySession } from "../types";
import {
	getTheorySessionLangCacheKey,
	peekMemoryCache,
	peekCache,
	writeCache,
} from "../cache";

export function useTheorySession(
	userId?: string | null,
	sessionId?: string | null,
	language?: string | null,
) {
	const normalizedSessionId = (sessionId ?? "").trim();
	const languageKey = (language ?? "default").trim() || "default";
	const initialCacheKey =
		userId && normalizedSessionId
			? getTheorySessionLangCacheKey(userId, normalizedSessionId, languageKey)
			: null;
	const initialSession = initialCacheKey
		? peekMemoryCache<TheorySession>(initialCacheKey)
		: null;

	const [session, setSession] = useState<TheorySession | null>(initialSession);
	const [isLoading, setIsLoading] = useState(initialSession === null);
	const [error, setError] = useState("");
	const hasCachedViewRef = useRef(initialSession !== null);

	useEffect(() => {
		hasCachedViewRef.current = session !== null;
	}, [session]);

	const reload = useCallback(async () => {
		if (!userId || !normalizedSessionId) {
			setSession(null);
			setError("");
			setIsLoading(false);
			return;
		}

		setIsLoading(!hasCachedViewRef.current);
		setError("");
		const cacheKey = getTheorySessionLangCacheKey(
			userId,
			normalizedSessionId,
			languageKey,
		);
		const memoryCached = peekMemoryCache<TheorySession>(cacheKey);
		if (memoryCached) {
			setSession(memoryCached);
			setIsLoading(false);
		}

		try {
			const cached = await peekCache<TheorySession>(cacheKey);
			if (cached) {
				setSession(cached);
				setIsLoading(false);
			}
		} catch {
			// cache read errors are ignored
		}

		try {
			const data = await loadTheorySession(userId, normalizedSessionId);
			setSession(data);
			await writeCache(cacheKey, data);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Test ma'lumotini yuklashda xatolik yuz berdi.";
			setError(message);
			setSession((prev) => prev);
		} finally {
			setIsLoading(false);
		}
	}, [languageKey, normalizedSessionId, userId]);

	useEffect(() => {
		reload().catch(() => {});
	}, [reload]);

	return { session, isLoading, error, reload };
}
