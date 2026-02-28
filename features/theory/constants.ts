import type { TestSettings } from "./types";

export const SETTINGS_KEYS = {
	showMistakesOnly: "settings:showMistakesOnly",
	shuffleQuestions: "settings:shuffleQuestions",
	autoAdvance: "settings:autoAdvance",
} as const;

export const DEFAULT_TEST_SETTINGS: TestSettings = {
	showMistakesOnly: false,
	shuffleQuestions: true,
	autoAdvance: false,
};

export const AUTO_ADVANCE_DELAY_MS = 450;
export const SECONDS_PER_QUESTION = 15;
export const MIN_TEST_SECONDS = 5 * 60;
