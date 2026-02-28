import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { completeTheorySession } from "../api";
import { flushSessionCompletionQueue } from "../offline-queue";

const SYNC_INTERVAL_MS = 15000;

export function useTheoryOfflineSync(userId?: string | null) {
	const isSyncingRef = useRef(false);

	useEffect(() => {
		if (!userId) return;

		let isUnmounted = false;

		const runSync = async () => {
			if (isUnmounted || isSyncingRef.current) return;
			isSyncingRef.current = true;
			try {
				await flushSessionCompletionQueue(userId, async (item) => {
					await completeTheorySession({
						userId: item.userId,
						sessionId: item.sessionId,
						answers: item.answers,
					});
				});
			} finally {
				isSyncingRef.current = false;
			}
		};

		runSync().catch(() => {});

		const interval = setInterval(() => {
			runSync().catch(() => {});
		}, SYNC_INTERVAL_MS);

		const appStateSub = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				runSync().catch(() => {});
			}
		});

		return () => {
			isUnmounted = true;
			clearInterval(interval);
			appStateSub.remove();
		};
	}, [userId]);
}
