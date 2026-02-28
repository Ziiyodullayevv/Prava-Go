import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_TEST_SETTINGS, SETTINGS_KEYS } from "../constants";
import type { TestSettings } from "../types";

function toStorageValue(value: boolean) {
	return value ? "1" : "0";
}

function fromStorageValue(value: string | null, fallback: boolean) {
	if (value === "1") return true;
	if (value === "0") return false;
	return fallback;
}

export function useTheoryTestSettings() {
	const [settings, setSettings] = useState<TestSettings>(DEFAULT_TEST_SETTINGS);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setIsReady(false);

		(async () => {
			try {
				const [showOnlyMistakes, shuffleQuestions, autoAdvance] =
					await Promise.all([
						AsyncStorage.getItem(SETTINGS_KEYS.showMistakesOnly),
						AsyncStorage.getItem(SETTINGS_KEYS.shuffleQuestions),
						AsyncStorage.getItem(SETTINGS_KEYS.autoAdvance),
					]);

				if (cancelled) return;

				setSettings({
					showMistakesOnly: fromStorageValue(
						showOnlyMistakes,
						DEFAULT_TEST_SETTINGS.showMistakesOnly,
					),
					shuffleQuestions: fromStorageValue(
						shuffleQuestions,
						DEFAULT_TEST_SETTINGS.shuffleQuestions,
					),
					autoAdvance: fromStorageValue(
						autoAdvance,
						DEFAULT_TEST_SETTINGS.autoAdvance,
					),
				});
			} finally {
				if (!cancelled) setIsReady(true);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	const setShowMistakesOnly = useCallback((value: boolean) => {
		setSettings((prev) => ({ ...prev, showMistakesOnly: value }));
		AsyncStorage.setItem(SETTINGS_KEYS.showMistakesOnly, toStorageValue(value)).catch(
			() => {},
		);
	}, []);

	const setShuffleQuestions = useCallback((value: boolean) => {
		setSettings((prev) => ({ ...prev, shuffleQuestions: value }));
		AsyncStorage.setItem(SETTINGS_KEYS.shuffleQuestions, toStorageValue(value)).catch(
			() => {},
		);
	}, []);

	const setAutoAdvance = useCallback((value: boolean) => {
		setSettings((prev) => ({ ...prev, autoAdvance: value }));
		AsyncStorage.setItem(SETTINGS_KEYS.autoAdvance, toStorageValue(value)).catch(
			() => {},
		);
	}, []);

	return useMemo(
		() => ({
			settings,
			isReady,
			setShowMistakesOnly,
			setShuffleQuestions,
			setAutoAdvance,
		}),
		[settings, isReady, setShowMistakesOnly, setShuffleQuestions, setAutoAdvance],
	);
}
