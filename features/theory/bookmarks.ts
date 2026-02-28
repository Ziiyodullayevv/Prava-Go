import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentLanguage } from "@/locales/i18n-provider";
import {
	getNormalizedLanguage,
	getQuestionByIdForLanguage,
} from "./local-question-bank";
import type { SessionQuestionOption } from "./types";

type BookmarkEntry = {
	questionId: string;
	savedAt: string;
};

export type BookmarkedQuestion = {
	questionId: string;
	savedAt: string;
	prompt: string;
	imageUrl: string | null;
	explanation: string | null;
	options: SessionQuestionOption[];
};

function getBookmarksKey(userId: string) {
	return `store:theory:bookmarks:${userId}`;
}

function toTimestamp(value?: string | null) {
	if (!value) return 0;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeEntry(value: unknown): BookmarkEntry | null {
	if (!value || typeof value !== "object") return null;
	const item = value as Partial<BookmarkEntry>;
	const questionId = String(item.questionId ?? "").trim();
	if (!questionId) return null;
	const savedAt =
		typeof item.savedAt === "string" && item.savedAt.trim().length > 0
			? item.savedAt
			: new Date().toISOString();
	return { questionId, savedAt };
}

async function readBookmarkEntries(userId: string) {
	const raw = await AsyncStorage.getItem(getBookmarksKey(userId));
	if (!raw) return [] as BookmarkEntry[];

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [] as BookmarkEntry[];
		const normalized = parsed
			.map((item) => normalizeEntry(item))
			.filter(Boolean) as BookmarkEntry[];
		return normalized.sort(
			(a, b) => toTimestamp(b.savedAt) - toTimestamp(a.savedAt),
		);
	} catch {
		return [] as BookmarkEntry[];
	}
}

async function writeBookmarkEntries(userId: string, entries: BookmarkEntry[]) {
	await AsyncStorage.setItem(getBookmarksKey(userId), JSON.stringify(entries));
}

export async function loadBookmarkedQuestionIds(userId: string) {
	const entries = await readBookmarkEntries(userId);
	return entries.map((item) => item.questionId);
}

export async function toggleBookmarkedQuestion(
	userId: string,
	questionId: string,
) {
	const normalizedQuestionId = String(questionId ?? "").trim();
	if (!normalizedQuestionId) {
		return { isBookmarked: false };
	}

	const entries = await readBookmarkEntries(userId);
	const existingIndex = entries.findIndex(
		(item) => item.questionId === normalizedQuestionId,
	);

	if (existingIndex >= 0) {
		const nextEntries = entries.filter(
			(item) => item.questionId !== normalizedQuestionId,
		);
		await writeBookmarkEntries(userId, nextEntries);
		return { isBookmarked: false };
	}

	const nextEntries = [
		{ questionId: normalizedQuestionId, savedAt: new Date().toISOString() },
		...entries,
	];
	await writeBookmarkEntries(userId, nextEntries);
	return { isBookmarked: true };
}

export async function loadBookmarkedQuestions(
	userId: string,
	language?: string | null,
) {
	const entries = await readBookmarkEntries(userId);
	if (entries.length === 0) return [] as BookmarkedQuestion[];

	const normalizedLanguage = getNormalizedLanguage(language ?? getCurrentLanguage());
	const questions: BookmarkedQuestion[] = [];

	for (const entry of entries) {
		const question = getQuestionByIdForLanguage(
			normalizedLanguage,
			entry.questionId,
		);
		if (!question) continue;
		questions.push({
			questionId: question.id,
			savedAt: entry.savedAt,
			prompt: question.prompt,
			imageUrl: question.imageUrl,
			explanation: question.explanation,
			options: question.options,
		});
	}

	return questions;
}
