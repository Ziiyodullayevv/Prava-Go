import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TestMode, TestSettings } from "./types";

const STORE_VERSION = 1;

type Envelope<T> = {
	version: number;
	data: T;
};

export type LocalStoreQuestionStats = {
	questionId: string;
	seenCount: number;
	correctCount: number;
	incorrectCount: number;
	lastIsCorrect: boolean | null;
	lastAnsweredAt: string | null;
};

export type LocalSessionQuestion = {
	id: string;
	questionId: string;
	position: number;
	selectedOptionId: string | null;
	isCorrect: boolean | null;
	answeredAt: string | null;
};

export type LocalSession = {
	id: string;
	userId: string;
	topicId: string | null;
	mode: TestMode;
	totalQuestions: number;
	settings: TestSettings;
	startedAt: string;
	finishedAt: string | null;
	scoreCorrect: number;
	scoreIncorrect: number;
	questions: LocalSessionQuestion[];
};

type LocalStatsMap = Record<string, LocalStoreQuestionStats>;
type LocalSessionMap = Record<string, LocalSession>;

const memoryStatsCache = new Map<string, LocalStatsMap>();
const memorySessionsCache = new Map<string, LocalSessionMap>();

function toStatsKey(userId: string) {
	return `store:theory:stats:${userId}`;
}

function toSessionsKey(userId: string) {
	return `store:theory:sessions:${userId}`;
}

function normalizeCount(value: unknown) {
	if (typeof value !== "number" || Number.isNaN(value)) return 0;
	return Math.max(0, Math.floor(value));
}

function normalizeStats(value: unknown): LocalStoreQuestionStats {
	const item = (value ?? {}) as Partial<LocalStoreQuestionStats>;
	return {
		questionId: String(item.questionId ?? "").trim(),
		seenCount: normalizeCount(item.seenCount),
		correctCount: normalizeCount(item.correctCount),
		incorrectCount: normalizeCount(item.incorrectCount),
		lastIsCorrect:
			typeof item.lastIsCorrect === "boolean" ? item.lastIsCorrect : null,
		lastAnsweredAt:
			typeof item.lastAnsweredAt === "string" ? item.lastAnsweredAt : null,
	};
}

function normalizeQuestion(value: unknown): LocalSessionQuestion {
	const item = (value ?? {}) as Partial<LocalSessionQuestion>;
	return {
		id: String(item.id ?? "").trim(),
		questionId: String(item.questionId ?? "").trim(),
		position: normalizeCount(item.position),
		selectedOptionId:
			typeof item.selectedOptionId === "string" ? item.selectedOptionId : null,
		isCorrect: typeof item.isCorrect === "boolean" ? item.isCorrect : null,
		answeredAt: typeof item.answeredAt === "string" ? item.answeredAt : null,
	};
}

function normalizeSession(value: unknown): LocalSession {
	const item = (value ?? {}) as Partial<LocalSession>;
	const questions = Array.isArray(item.questions)
		? item.questions.map(normalizeQuestion).filter((question) => question.id)
		: [];

	return {
		id: String(item.id ?? "").trim(),
		userId: String(item.userId ?? "").trim(),
		topicId: typeof item.topicId === "string" ? item.topicId : null,
		mode:
			item.mode === "mock_exam"
				? "mock_exam"
				: item.mode === "marathon"
					? "marathon"
					: item.mode === "mistakes_practice"
						? "mistakes_practice"
					: "topic_practice",
		totalQuestions: normalizeCount(item.totalQuestions),
		settings: {
			showMistakesOnly: Boolean(item.settings?.showMistakesOnly),
			shuffleQuestions: Boolean(item.settings?.shuffleQuestions),
			autoAdvance: Boolean(item.settings?.autoAdvance),
		},
		startedAt:
			typeof item.startedAt === "string"
				? item.startedAt
				: new Date().toISOString(),
		finishedAt: typeof item.finishedAt === "string" ? item.finishedAt : null,
		scoreCorrect: normalizeCount(item.scoreCorrect),
		scoreIncorrect: normalizeCount(item.scoreIncorrect),
		questions: questions.sort((a, b) => a.position - b.position),
	};
}

async function readEnvelope<T>(key: string): Promise<T | null> {
	const raw = await AsyncStorage.getItem(key);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as Envelope<T>;
		if (!parsed || parsed.version !== STORE_VERSION) return null;
		return parsed.data;
	} catch {
		return null;
	}
}

async function writeEnvelope<T>(key: string, data: T) {
	const payload: Envelope<T> = { version: STORE_VERSION, data };
	await AsyncStorage.setItem(key, JSON.stringify(payload));
}

export async function readLocalStats(userId: string) {
	const cached = memoryStatsCache.get(userId);
	if (cached) return new Map(Object.entries(cached));

	const key = toStatsKey(userId);
	const parsed = (await readEnvelope<LocalStatsMap>(key)) ?? {};
	const normalized: LocalStatsMap = {};

	for (const [questionId, value] of Object.entries(parsed)) {
		const item = normalizeStats(value);
		if (!item.questionId) continue;
		normalized[questionId] = item;
	}

	memoryStatsCache.set(userId, normalized);
	return new Map(Object.entries(normalized));
}

export async function writeLocalStats(
	userId: string,
	statsMap: Map<string, LocalStoreQuestionStats>,
) {
	const key = toStatsKey(userId);
	const next: LocalStatsMap = {};
	for (const [questionId, item] of statsMap.entries()) {
		if (!questionId) continue;
		next[questionId] = normalizeStats(item);
	}

	memoryStatsCache.set(userId, next);
	await writeEnvelope(key, next);
}

export async function readLocalSessions(userId: string) {
	const cached = memorySessionsCache.get(userId);
	if (cached) {
		return new Map(
			Object.entries(cached).map(([sessionId, session]) => [sessionId, session]),
		);
	}

	const key = toSessionsKey(userId);
	const parsed = (await readEnvelope<LocalSessionMap>(key)) ?? {};
	const normalized: LocalSessionMap = {};

	for (const [sessionId, value] of Object.entries(parsed)) {
		const session = normalizeSession(value);
		if (!session.id || session.id !== sessionId) continue;
		normalized[sessionId] = session;
	}

	memorySessionsCache.set(userId, normalized);
	return new Map(
		Object.entries(normalized).map(([sessionId, session]) => [sessionId, session]),
	);
}

export async function writeLocalSessions(
	userId: string,
	sessionMap: Map<string, LocalSession>,
) {
	const key = toSessionsKey(userId);
	const next: LocalSessionMap = {};
	for (const [sessionId, session] of sessionMap.entries()) {
		if (!sessionId) continue;
		next[sessionId] = normalizeSession(session);
	}

	memorySessionsCache.set(userId, next);
	await writeEnvelope(key, next);
}
