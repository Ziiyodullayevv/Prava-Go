import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabaseClient } from "@/lib/supabase";
import {
	getCurrentLanguage,
	type SupportedLanguage,
} from "@/locales/i18n-provider";
import { DEFAULT_TEST_SETTINGS } from "./constants";
import {
	getTheoryTopicQuestionBankLangCacheKey,
	peekCache,
	writeCache,
} from "./cache";
import {
	getQuestionByIdForLanguage,
	getQuestionBankForLanguage,
	getQuestionsByTopicForLanguage,
	getNormalizedLanguage,
	type LocalQuestion,
	type LocalTopic,
} from "./local-question-bank";
import {
	readLocalSessions,
	readLocalStats,
	writeLocalSessions,
	writeLocalStats,
	type LocalSession,
	type LocalSessionQuestion,
	type LocalStoreQuestionStats,
} from "./local-store";
import type {
	MistakeQuestionPack,
	MistakeQuestionPacksOverview,
	SessionQuestion,
	SessionQuestionOption,
	TestMode,
	TestSettings,
	TheoryOverview,
	TheorySession,
	TheorySummary,
	TheoryTopic,
	TheoryTopicDetail,
} from "./types";

type TopicRow = {
	id: string;
	slug: string;
	title: string;
	subtitle: string | null;
	order: number | null;
	image_key: string | null;
};

type UserQuestionStatsRow = {
	question_id: string;
	seen_count: number | null;
	correct_count: number | null;
	incorrect_count: number | null;
	last_is_correct: boolean | null;
	last_answered_at?: string | null;
};

export type TopicQuestionBankQuestion = {
	questionId: string;
	prompt: string;
	imageUrl: string | null;
	explanation: string | null;
	options: SessionQuestionOption[];
};

export type TopicQuestionBank = {
	topicId: string;
	questions: TopicQuestionBankQuestion[];
	updatedAt: string;
};

export type CreatedTheorySessionQuestion = {
	id: string;
	questionId: string;
	position: number;
};

export type CreateTheorySessionResult = {
	sessionId: string;
	startedAt: string;
	sessionQuestions: CreatedTheorySessionQuestion[];
};

export type CreateTheorySessionInput = {
	userId: string;
	topicId: string;
	mode?: TestMode;
	questionLimit?: number | null;
	settings: TestSettings;
	availableQuestionIds?: string[];
};

export type CreateMockExamSessionInput = {
	userId: string;
	questionLimit?: number | null;
	settings: TestSettings;
};

export type CreateMarathonSessionInput = {
	userId: string;
	questionLimit?: number | null;
	settings: TestSettings;
};

export type CreateMistakePracticeSessionInput = {
	userId: string;
	questionIds: string[];
	settings: TestSettings;
};

export type SubmitTheoryAnswerInput = {
	userId: string;
	sessionId: string;
	sessionQuestionId: string;
	questionId: string;
	selectedOptionId: string;
};

export type SubmitTheoryAnswerResult = {
	isCorrect: boolean;
	alreadyAnswered: boolean;
	finished: boolean;
	scoreCorrect: number;
	scoreIncorrect: number;
};

export type CompleteTheorySessionAnswer = {
	sessionQuestionId: string;
	questionId: string;
	selectedOptionId: string;
	isCorrect: boolean;
	answeredAt: string;
};

export type CompleteTheorySessionInput = {
	userId: string;
	sessionId: string;
	answers: CompleteTheorySessionAnswer[];
	syncRemote?: boolean;
};

export type CompleteTheorySessionResult = {
	scoreCorrect: number;
	scoreIncorrect: number;
	finishedAt: string;
};

const REMOTE_SYNC_ENABLED =
	process.env.EXPO_PUBLIC_SUPABASE_OFFLINE_SYNC_ENABLED !== "0";
const REMOTE_STATS_TABLE =
	process.env.EXPO_PUBLIC_SUPABASE_STATS_TABLE ?? "user_theory_question_stats";
const REMOTE_SESSIONS_TABLE =
	process.env.EXPO_PUBLIC_SUPABASE_SESSIONS_TABLE ?? "user_theory_sessions";

export const EMPTY_SUMMARY: TheorySummary = {
	totalTopics: 0,
	totalQuestions: 0,
	seenQuestions: 0,
	notSeenQuestions: 0,
	progressPercent: 0,
};

export const EMPTY_OVERVIEW: TheoryOverview = {
	summary: EMPTY_SUMMARY,
	topics: [],
};

function toCount(value: number | null | undefined) {
	if (typeof value !== "number" || Number.isNaN(value)) return 0;
	return Math.max(0, Math.floor(value));
}

function normalizeTimestamp(value?: string | null) {
	if (!value) return 0;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function shuffleArray<T>(items: T[]) {
	const next = [...items];
	for (let i = next.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		const current = next[i];
		next[i] = next[j];
		next[j] = current;
	}
	return next;
}

function parseSettings(raw: unknown): TestSettings {
	if (!raw || typeof raw !== "object") return DEFAULT_TEST_SETTINGS;
	const obj = raw as Partial<TestSettings>;
	return {
		showMistakesOnly: Boolean(obj.showMistakesOnly),
		shuffleQuestions:
			typeof obj.shuffleQuestions === "boolean"
				? obj.shuffleQuestions
				: DEFAULT_TEST_SETTINGS.shuffleQuestions,
		autoAdvance: Boolean(obj.autoAdvance),
	};
}

function sortOptionsByOrder(options: SessionQuestionOption[]) {
	return [...options].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

function buildTopicStats(
	topic: TopicRow,
	questionIds: string[],
	statsMap: Map<string, UserQuestionStatsRow>,
): TheoryTopic {
	let seenQuestions = 0;
	let answeredQuestions = 0;
	let correctCount = 0;
	let incorrectCount = 0;

	for (const questionId of questionIds) {
		const stat = statsMap.get(questionId);
		if (!stat) continue;

		const seen = toCount(stat.seen_count);
		const correct = toCount(stat.correct_count);
		const incorrect = toCount(stat.incorrect_count);

		if (seen > 0) seenQuestions += 1;
		if (correct + incorrect > 0) answeredQuestions += 1;

		if (stat.last_is_correct === true) {
			correctCount += 1;
		} else if (stat.last_is_correct === false) {
			incorrectCount += 1;
		}
	}

	const totalQuestions = questionIds.length;
	const completed = totalQuestions > 0 && seenQuestions >= totalQuestions;
	const progressPercent =
		totalQuestions > 0 ? Math.round((seenQuestions / totalQuestions) * 100) : 0;

	return {
		id: topic.id,
		slug: topic.slug,
		title: topic.title,
		subtitle: topic.subtitle?.trim() || "",
		order: toCount(topic.order),
		imageKey: topic.image_key,
		totalQuestions,
		seenQuestions,
		answeredQuestions,
		correctCount,
		incorrectCount,
		completed,
		progressPercent,
	};
}

function buildOverview(topics: TheoryTopic[]): TheoryOverview {
	const totalQuestions = topics.reduce((sum, topic) => sum + topic.totalQuestions, 0);
	const seenQuestions = topics.reduce((sum, topic) => sum + topic.seenQuestions, 0);
	const notSeenQuestions = Math.max(0, totalQuestions - seenQuestions);
	const progressPercent =
		totalQuestions > 0 ? Math.round((seenQuestions / totalQuestions) * 100) : 0;

	return {
		summary: {
			totalTopics: topics.length,
			totalQuestions,
			seenQuestions,
			notSeenQuestions,
			progressPercent,
		},
		topics,
	};
}

function toTopicRow(topic: LocalTopic): TopicRow {
	return {
		id: topic.id,
		slug: topic.slug,
		title: topic.title,
		subtitle: topic.subtitle,
		order: topic.order,
		image_key: topic.imageKey,
	};
}

function toQuestionBankQuestion(question: LocalQuestion): TopicQuestionBankQuestion {
	return {
		questionId: question.id,
		prompt: question.prompt,
		imageUrl: question.imageUrl,
		explanation: question.explanation,
		options: sortOptionsByOrder(question.options),
	};
}

function toSessionQuestion(
	sessionQuestion: LocalSessionQuestion,
	question: LocalQuestion,
): SessionQuestion {
	return {
		sessionQuestionId: sessionQuestion.id,
		questionId: sessionQuestion.questionId,
		position: sessionQuestion.position,
		prompt: question.prompt,
		imageUrl: question.imageUrl,
		explanation: question.explanation,
		options: sortOptionsByOrder(question.options),
		selectedOptionId: sessionQuestion.selectedOptionId,
		isCorrect: sessionQuestion.isCorrect,
		answeredAt: sessionQuestion.answeredAt,
	};
}

function mapLocalStatsToApiRows(
	localStatsMap: Map<string, LocalStoreQuestionStats>,
): Map<string, UserQuestionStatsRow> {
	const mapped = new Map<string, UserQuestionStatsRow>();
	for (const [questionId, stats] of localStatsMap.entries()) {
		mapped.set(questionId, {
			question_id: questionId,
			seen_count: toCount(stats.seenCount),
			correct_count: toCount(stats.correctCount),
			incorrect_count: toCount(stats.incorrectCount),
			last_is_correct:
				typeof stats.lastIsCorrect === "boolean" ? stats.lastIsCorrect : null,
			last_answered_at: stats.lastAnsweredAt,
		});
	}
	return mapped;
}

function getActiveLanguage(): SupportedLanguage {
	return getNormalizedLanguage(getCurrentLanguage());
}

function createSessionId() {
	const rand = Math.random().toString(36).slice(2, 10);
	return `local-${Date.now().toString(36)}-${rand}`;
}

function createSessionQuestionId(sessionId: string, position: number) {
	return `${sessionId}:q:${position}`;
}

const MOCK_EXAM_DEFAULT_LIMIT = 20;
const MARATHON_DEFAULT_LIMIT = 50;
const MISTAKE_PACK_SIZE = 20;

type SessionHistoryScope = "mock" | "marathon";

function getSessionHistoryKey(
	userId: string,
	language: SupportedLanguage,
	scope: SessionHistoryScope,
) {
	return `store:theory:${scope}-history:${language}:${userId}`;
}

async function readSessionHistory(
	userId: string,
	language: SupportedLanguage,
	scope: SessionHistoryScope,
): Promise<string[]> {
	const raw = await AsyncStorage.getItem(
		getSessionHistoryKey(userId, language, scope),
	);
	if (!raw) return [];

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((item) => String(item ?? "").trim())
			.filter((item) => item.length > 0);
	} catch {
		return [];
	}
}

async function writeSessionHistory(
	userId: string,
	language: SupportedLanguage,
	scope: SessionHistoryScope,
	questionIds: string[],
) {
	await AsyncStorage.setItem(
		getSessionHistoryKey(userId, language, scope),
		JSON.stringify(questionIds),
	);
}

function dedupeKeepLatest(questionIds: string[]) {
	const seen = new Set<string>();
	const uniqueReversed: string[] = [];

	for (let index = questionIds.length - 1; index >= 0; index -= 1) {
		const questionId = String(questionIds[index] ?? "").trim();
		if (!questionId || seen.has(questionId)) continue;
		seen.add(questionId);
		uniqueReversed.push(questionId);
	}

	return uniqueReversed.reverse();
}

function getMockHistoryLimit(totalQuestionCount: number, questionLimit: number) {
	return Math.max(questionLimit * 12, Math.floor(totalQuestionCount * 0.75));
}

function selectMockExamQuestionIds(
	allQuestionIds: string[],
	questionLimit: number,
	recentQuestionIds: string[],
) {
	const uniqueQuestionIds = dedupeKeepLatest(allQuestionIds);
	const normalizedLimit = Math.max(
		1,
		Math.min(questionLimit, uniqueQuestionIds.length),
	);
	const recentSet = new Set(recentQuestionIds);
	const freshPool = uniqueQuestionIds.filter((questionId) => !recentSet.has(questionId));
	const selected = shuffleArray(freshPool).slice(0, normalizedLimit);

	if (selected.length < normalizedLimit) {
		const selectedSet = new Set(selected);
		const fallbackPool = uniqueQuestionIds.filter(
			(questionId) => !selectedSet.has(questionId),
		);
		selected.push(
			...shuffleArray(fallbackPool).slice(0, normalizedLimit - selected.length),
		);
	}

	return selected;
}

async function getWrongQuestionIds(userId: string, language: SupportedLanguage) {
	const statsMap = await readLocalStats(userId);
	const bank = getQuestionBankForLanguage(language);

	const entries = [...statsMap.entries()]
		.filter(([questionId, stats]) => {
			if (stats.lastIsCorrect !== false) return false;
			return bank.questionTopicIdById.has(questionId);
		})
		.sort((a, b) => {
			const timeDiff =
				normalizeTimestamp(b[1].lastAnsweredAt) -
				normalizeTimestamp(a[1].lastAnsweredAt);
			if (timeDiff !== 0) return timeDiff;
			return a[0].localeCompare(b[0]);
		});

	return entries.map(([questionId]) => questionId);
}

function splitIntoPacks(questionIds: string[], packSize: number) {
	const packs: MistakeQuestionPack[] = [];
	const normalizedPackSize = Math.max(1, Math.floor(packSize));

	for (let index = 0; index < questionIds.length; index += normalizedPackSize) {
		const chunk = questionIds.slice(index, index + normalizedPackSize);
		if (chunk.length === 0) continue;
		packs.push({
			id: String(Math.floor(index / normalizedPackSize) + 1),
			totalQuestions: chunk.length,
			questionIds: chunk,
		});
	}

	return packs;
}

async function persistLocalSession({
	userId,
	topicId,
	mode,
	settings,
	selectedQuestionIds,
}: {
	userId: string;
	topicId: string | null;
	mode: TestMode;
	settings: TestSettings;
	selectedQuestionIds: string[];
}): Promise<CreateTheorySessionResult> {
	const sessionId = createSessionId();
	const startedAt = new Date().toISOString();
	const sessionQuestions: LocalSessionQuestion[] = selectedQuestionIds.map(
		(questionId, index) => ({
			id: createSessionQuestionId(sessionId, index + 1),
			questionId,
			position: index + 1,
			selectedOptionId: null,
			isCorrect: null,
			answeredAt: null,
		}),
	);

	const nextSession: LocalSession = {
		id: sessionId,
		userId,
		topicId,
		mode,
		totalQuestions: selectedQuestionIds.length,
		settings,
		startedAt,
		finishedAt: null,
		scoreCorrect: 0,
		scoreIncorrect: 0,
		questions: sessionQuestions,
	};

	const sessionMap = await readLocalSessions(userId);
	sessionMap.set(sessionId, nextSession);
	await writeLocalSessions(userId, sessionMap);

	return {
		sessionId,
		startedAt,
		sessionQuestions: sessionQuestions.map((row) => ({
			id: row.id,
			questionId: row.questionId,
			position: row.position,
		})),
	};
}

function shouldIgnoreSyncError(error: unknown) {
	const message =
		error && typeof error === "object" && "message" in error
			? String((error as { message?: unknown }).message ?? "")
			: "";
	const normalized = message.toLowerCase();
	if (!normalized) return false;
	return (
		normalized.includes("does not exist") ||
		normalized.includes("relation") ||
		normalized.includes("invalid input syntax")
	);
}

async function fetchTopicQuestionBank(topicId: string): Promise<TopicQuestionBank> {
	const language = getActiveLanguage();
	const localQuestions = getQuestionsByTopicForLanguage(language, topicId);

	return {
		topicId,
		questions: localQuestions.map(toQuestionBankQuestion),
		updatedAt: new Date().toISOString(),
	};
}

export async function loadTopicQuestionBank(topicId: string): Promise<TopicQuestionBank> {
	const cacheKey = getTheoryTopicQuestionBankLangCacheKey(topicId, getActiveLanguage());
	const cached = await peekCache<TopicQuestionBank>(cacheKey);
	if (cached && cached.topicId === topicId && cached.questions.length > 0) {
		return cached;
	}

	const fresh = await fetchTopicQuestionBank(topicId);
	await writeCache(cacheKey, fresh);
	return fresh;
}

export async function preloadTopicQuestionBank(topicId: string) {
	try {
		const cacheKey = getTheoryTopicQuestionBankLangCacheKey(
			topicId,
			getActiveLanguage(),
		);
		const cached = await peekCache<TopicQuestionBank>(cacheKey);
		if (cached && cached.topicId === topicId && cached.questions.length > 0) {
			return;
		}

		const fresh = await fetchTopicQuestionBank(topicId);
		await writeCache(cacheKey, fresh);
	} catch {
		// silent preload
	}
}

export async function loadTheoryOverview(userId: string): Promise<TheoryOverview> {
	const bank = getQuestionBankForLanguage(getActiveLanguage());
	if (bank.topics.length === 0) return EMPTY_OVERVIEW;

	const localStatsMap = await readLocalStats(userId);
	const statsMap = mapLocalStatsToApiRows(localStatsMap);

	const topics = bank.topics
		.map((topic) => {
			return buildTopicStats(
				toTopicRow(topic),
				topic.questionIds,
				statsMap,
			);
		})
		.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

	return buildOverview(topics);
}

export async function loadTheoryTopicDetail(
	userId: string,
	slug: string,
): Promise<TheoryTopicDetail> {
	const bank = getQuestionBankForLanguage(getActiveLanguage());
	const topic = bank.topicBySlug.get(slug);
	if (!topic) {
		throw new Error("Bo'lim topilmadi.");
	}

	const localStatsMap = await readLocalStats(userId);
	const statsMap = mapLocalStatsToApiRows(localStatsMap);

	return {
		topic: buildTopicStats(
			toTopicRow(topic),
			topic.questionIds,
			statsMap,
		),
	};
}

export async function createTheorySession({
	userId,
	topicId,
	mode = "topic_practice",
	questionLimit,
	settings,
	availableQuestionIds,
}: CreateTheorySessionInput): Promise<CreateTheorySessionResult> {
	const bank = getQuestionBankForLanguage(getActiveLanguage());
	const topic = bank.topicById.get(topicId);
	if (!topic) {
		throw new Error("Bo'lim topilmadi.");
	}

	const topicQuestionIds = [...topic.questionIds];
	let allQuestionIds: string[] = [];
	if (Array.isArray(availableQuestionIds) && availableQuestionIds.length > 0) {
		const topicQuestionSet = new Set(topicQuestionIds);
		const uniqueFiltered = new Set<string>();
		for (const rawQuestionId of availableQuestionIds) {
			const questionId = String(rawQuestionId ?? "").trim();
			if (!questionId) continue;
			if (!topicQuestionSet.has(questionId)) continue;
			uniqueFiltered.add(questionId);
		}

		// Cache list can be stale; fallback to canonical topic question ids.
		allQuestionIds =
			uniqueFiltered.size > 0 ? [...uniqueFiltered] : topicQuestionIds;
	} else {
		allQuestionIds = topicQuestionIds;
	}

	if (allQuestionIds.length === 0) {
		throw new Error("Bu bo'lim uchun savollar topilmadi.");
	}

	let pool = [...allQuestionIds];

	if (settings.showMistakesOnly) {
		const statsMap = await readLocalStats(userId);
		pool = allQuestionIds.filter((questionId) => {
			const stats = statsMap.get(questionId);
			if (!stats) return false;
			if (toCount(stats.incorrectCount) > 0) return true;
			return stats.lastIsCorrect === false;
		});

		if (pool.length === 0) {
			throw new Error("Noto'g'ri ishlangan savollar topilmadi.");
		}
	}

	if (settings.shuffleQuestions) {
		pool = shuffleArray(pool);
	}

	const normalizedLimit =
		typeof questionLimit === "number" && questionLimit > 0
			? Math.floor(questionLimit)
			: null;
	const selectedQuestionIds =
		normalizedLimit !== null ? pool.slice(0, normalizedLimit) : pool;

	if (selectedQuestionIds.length === 0) {
		throw new Error("Test uchun savol tanlab bo'lmadi.");
	}

	return persistLocalSession({
		userId,
		topicId,
		mode,
		settings,
		selectedQuestionIds,
	});
}

export async function createMockExamSession({
	userId,
	questionLimit,
	settings,
}: CreateMockExamSessionInput): Promise<CreateTheorySessionResult> {
	const language = getActiveLanguage();
	const bank = getQuestionBankForLanguage(language);
	const allQuestionIds = bank.topics.flatMap((topic) => topic.questionIds);

	if (allQuestionIds.length === 0) {
		throw new Error("Mock imtihon uchun savollar topilmadi.");
	}

	const normalizedLimit =
		typeof questionLimit === "number" && questionLimit > 0
			? Math.floor(questionLimit)
			: MOCK_EXAM_DEFAULT_LIMIT;
	const recentQuestionIds = await readSessionHistory(userId, language, "mock");
	const selectedQuestionIds = selectMockExamQuestionIds(
		allQuestionIds,
		normalizedLimit,
		recentQuestionIds,
	);

	if (selectedQuestionIds.length === 0) {
		throw new Error("Mock imtihon savollarini tanlab bo'lmadi.");
	}

	const maxHistory = getMockHistoryLimit(allQuestionIds.length, selectedQuestionIds.length);
	const nextHistory = dedupeKeepLatest([...recentQuestionIds, ...selectedQuestionIds]).slice(
		-maxHistory,
	);
	await writeSessionHistory(userId, language, "mock", nextHistory);

	return persistLocalSession({
		userId,
		topicId: null,
		mode: "mock_exam",
		settings: {
			showMistakesOnly: false,
			shuffleQuestions: true,
			autoAdvance: Boolean(settings.autoAdvance),
		},
		selectedQuestionIds,
	});
}

export async function createMarathonSession({
	userId,
	questionLimit,
	settings,
}: CreateMarathonSessionInput): Promise<CreateTheorySessionResult> {
	const language = getActiveLanguage();
	const bank = getQuestionBankForLanguage(language);
	const allQuestionIds = bank.topics.flatMap((topic) => topic.questionIds);

	if (allQuestionIds.length === 0) {
		throw new Error("Marafon uchun savollar topilmadi.");
	}

	const normalizedLimit =
		typeof questionLimit === "number" && questionLimit > 0
			? Math.floor(questionLimit)
			: MARATHON_DEFAULT_LIMIT;
	const recentQuestionIds = await readSessionHistory(userId, language, "marathon");
	const selectedQuestionIds = selectMockExamQuestionIds(
		allQuestionIds,
		normalizedLimit,
		recentQuestionIds,
	);

	if (selectedQuestionIds.length === 0) {
		throw new Error("Marafon savollarini tanlab bo'lmadi.");
	}

	const maxHistory = getMockHistoryLimit(allQuestionIds.length, selectedQuestionIds.length);
	const nextHistory = dedupeKeepLatest([...recentQuestionIds, ...selectedQuestionIds]).slice(
		-maxHistory,
	);
	await writeSessionHistory(userId, language, "marathon", nextHistory);

	return persistLocalSession({
		userId,
		topicId: null,
		mode: "marathon",
		settings: {
			showMistakesOnly: false,
			shuffleQuestions: true,
			autoAdvance: Boolean(settings.autoAdvance),
		},
		selectedQuestionIds,
	});
}

export async function loadMistakeQuestionPacks(
	userId: string,
): Promise<MistakeQuestionPacksOverview> {
	const language = getActiveLanguage();
	const wrongQuestionIds = await getWrongQuestionIds(userId, language);
	const packs = splitIntoPacks(wrongQuestionIds, MISTAKE_PACK_SIZE);

	return {
		totalWrongQuestions: wrongQuestionIds.length,
		packs,
	};
}

export async function createMistakePracticeSession({
	userId,
	questionIds,
	settings,
}: CreateMistakePracticeSessionInput): Promise<CreateTheorySessionResult> {
	const language = getActiveLanguage();
	const bank = getQuestionBankForLanguage(language);
	const uniqueQuestionIds = dedupeKeepLatest(questionIds).filter((questionId) =>
		bank.questionTopicIdById.has(questionId),
	);

	if (uniqueQuestionIds.length === 0) {
		throw new Error("Xato savollar topilmadi.");
	}

	const selectedQuestionIds = settings.shuffleQuestions
		? shuffleArray(uniqueQuestionIds)
		: [...uniqueQuestionIds];

	return persistLocalSession({
		userId,
		topicId: null,
		mode: "mistakes_practice",
		settings: {
			showMistakesOnly: false,
			shuffleQuestions: true,
			autoAdvance: Boolean(settings.autoAdvance),
		},
		selectedQuestionIds,
	});
}

export async function loadTheorySession(
	userId: string,
	sessionId: string,
): Promise<TheorySession> {
	const sessionMap = await readLocalSessions(userId);
	const session = sessionMap.get(sessionId);
	if (!session) {
		throw new Error("Test session topilmadi.");
	}

	const bank = getQuestionBankForLanguage(getActiveLanguage());
	const topicMeta = session.topicId ? bank.topicById.get(session.topicId) ?? null : null;
	const language = getActiveLanguage();

	const questions: SessionQuestion[] = session.questions
		.slice()
		.sort((a, b) => a.position - b.position)
		.map((sessionQuestion) => {
			const question = getQuestionByIdForLanguage(
				language,
				sessionQuestion.questionId,
			);
			if (!question) {
				throw new Error("Session question ma'lumotlari topilmadi.");
			}
			return toSessionQuestion(sessionQuestion, question);
		});

	return {
		id: session.id,
		userId: session.userId,
		topicId: session.topicId,
		topicSlug: topicMeta?.slug ?? null,
		topicTitle: topicMeta?.title ?? null,
		mode: session.mode,
		totalQuestions: toCount(session.totalQuestions),
		settings: parseSettings(session.settings),
		startedAt: session.startedAt,
		finishedAt: session.finishedAt,
		scoreCorrect: toCount(session.scoreCorrect),
		scoreIncorrect: toCount(session.scoreIncorrect),
		questions,
	};
}

export async function submitTheoryAnswer({
	userId,
	sessionId,
	sessionQuestionId,
	questionId,
	selectedOptionId,
}: SubmitTheoryAnswerInput): Promise<SubmitTheoryAnswerResult> {
	const sessionMap = await readLocalSessions(userId);
	const session = sessionMap.get(sessionId);
	if (!session) {
		throw new Error("Test session topilmadi.");
	}

	const questionRow = session.questions.find(
		(item) => item.id === sessionQuestionId && item.questionId === questionId,
	);
	if (!questionRow) {
		throw new Error("Session savoli topilmadi.");
	}

	if (questionRow.selectedOptionId) {
		return {
			isCorrect: false,
			alreadyAnswered: true,
			finished: Boolean(session.finishedAt),
			scoreCorrect: toCount(session.scoreCorrect),
			scoreIncorrect: toCount(session.scoreIncorrect),
		};
	}

	const question = getQuestionByIdForLanguage(getActiveLanguage(), questionId);
	if (!question) {
		throw new Error("Savol topilmadi.");
	}

	const selectedOption = question.options.find((item) => item.id === selectedOptionId);
	if (!selectedOption) {
		throw new Error("Tanlangan javob varianti topilmadi.");
	}

	const answeredAt = new Date().toISOString();
	questionRow.selectedOptionId = selectedOption.id;
	questionRow.isCorrect = selectedOption.isCorrect;
	questionRow.answeredAt = answeredAt;

	session.scoreCorrect = session.questions.filter(
		(item) => item.selectedOptionId && item.isCorrect === true,
	).length;
	session.scoreIncorrect = session.questions.filter(
		(item) => item.selectedOptionId && item.isCorrect === false,
	).length;

	const unansweredCount = session.questions.filter(
		(item) => item.selectedOptionId === null,
	).length;
	if (unansweredCount === 0) {
		session.finishedAt = session.finishedAt ?? answeredAt;
	}

	sessionMap.set(session.id, session);
	await writeLocalSessions(userId, sessionMap);

	const localStatsMap = await readLocalStats(userId);
	const prev = localStatsMap.get(questionId);
	localStatsMap.set(questionId, {
		questionId,
		seenCount: toCount(prev?.seenCount) + 1,
		correctCount: toCount(prev?.correctCount) + (selectedOption.isCorrect ? 1 : 0),
		incorrectCount: toCount(prev?.incorrectCount) + (selectedOption.isCorrect ? 0 : 1),
		lastIsCorrect: selectedOption.isCorrect,
		lastAnsweredAt: answeredAt,
	});
	await writeLocalStats(userId, localStatsMap);

	return {
		isCorrect: selectedOption.isCorrect,
		alreadyAnswered: false,
		finished: unansweredCount === 0,
		scoreCorrect: session.scoreCorrect,
		scoreIncorrect: session.scoreIncorrect,
	};
}

export async function finishTheorySession(userId: string, sessionId: string) {
	const sessionMap = await readLocalSessions(userId);
	const session = sessionMap.get(sessionId);
	if (!session) return;

	if (!session.finishedAt) {
		session.finishedAt = new Date().toISOString();
		sessionMap.set(sessionId, session);
		await writeLocalSessions(userId, sessionMap);
	}
}

function getTouchedStatsPayload(
	userId: string,
	touchedQuestionIds: string[],
	statsMap: Map<string, LocalStoreQuestionStats>,
) {
	return touchedQuestionIds
		.map((questionId) => {
			const stats = statsMap.get(questionId);
			if (!stats) return null;
			return {
				user_id: userId,
				question_id: questionId,
				seen_count: toCount(stats.seenCount),
				correct_count: toCount(stats.correctCount),
				incorrect_count: toCount(stats.incorrectCount),
				last_is_correct:
					typeof stats.lastIsCorrect === "boolean" ? stats.lastIsCorrect : null,
				last_answered_at: stats.lastAnsweredAt,
			};
		})
		.filter(Boolean);
}

async function syncSessionToSupabase({
	userId,
	session,
	touchedQuestionIds,
	statsMap,
	answers,
	finishedAt,
}: {
	userId: string;
	session: LocalSession;
	touchedQuestionIds: string[];
	statsMap: Map<string, LocalStoreQuestionStats>;
	answers: CompleteTheorySessionAnswer[];
	finishedAt: string;
}) {
	if (!REMOTE_SYNC_ENABLED) return;

	const supabase = getSupabaseClient() as any;
	const touchedStatsPayload = getTouchedStatsPayload(
		userId,
		touchedQuestionIds,
		statsMap,
	);

	if (touchedStatsPayload.length > 0) {
		const { error: statsError } = await supabase
			.from(REMOTE_STATS_TABLE)
			.upsert(touchedStatsPayload, { onConflict: "user_id,question_id" });
		if (statsError) throw statsError;
	}

	const sessionPayload = {
		user_id: userId,
		session_id: session.id,
		topic_id: session.topicId,
		total_questions: toCount(session.totalQuestions),
		score_correct: toCount(session.scoreCorrect),
		score_incorrect: toCount(session.scoreIncorrect),
		finished_at: finishedAt,
		updated_at: new Date().toISOString(),
		payload: {
			mode: session.mode,
			settings: session.settings,
			started_at: session.startedAt,
			answers,
		},
	};

	const { error: sessionError } = await supabase
		.from(REMOTE_SESSIONS_TABLE)
		.upsert(sessionPayload, { onConflict: "user_id,session_id" });
	if (sessionError) throw sessionError;
}

export async function completeTheorySession({
	userId,
	sessionId,
	answers,
	syncRemote = true,
}: CompleteTheorySessionInput): Promise<CompleteTheorySessionResult> {
	const sessionMap = await readLocalSessions(userId);
	const session = sessionMap.get(sessionId);
	if (!session) {
		throw new Error("Test session topilmadi.");
	}

	const localStatsMap = await readLocalStats(userId);
	const now = new Date().toISOString();

	const normalizedAnswers = answers
		.filter(
			(item) =>
				item.sessionQuestionId &&
				item.questionId &&
				item.selectedOptionId &&
				item.answeredAt,
		)
		.sort((a, b) =>
			normalizeTimestamp(a.answeredAt) - normalizeTimestamp(b.answeredAt),
		);

	if (normalizedAnswers.length === 0) {
		session.finishedAt = session.finishedAt ?? now;
		sessionMap.set(session.id, session);
		await writeLocalSessions(userId, sessionMap);
		const result: CompleteTheorySessionResult = {
			scoreCorrect: toCount(session.scoreCorrect),
			scoreIncorrect: toCount(session.scoreIncorrect),
			finishedAt: session.finishedAt,
		};

		if (syncRemote) {
			try {
				await syncSessionToSupabase({
					userId,
					session,
					touchedQuestionIds: [],
					statsMap: localStatsMap,
					answers: [],
					finishedAt: session.finishedAt,
				});
			} catch (error) {
				if (!shouldIgnoreSyncError(error)) throw error;
			}
		}

		return result;
	}

	const language = getActiveLanguage();
	const sessionQuestionMap = new Map(
		session.questions.map((item) => [item.id, item] as const),
	);

	const latestByQuestion = new Map<string, { isCorrect: boolean; answeredAt: string }>();
	const pendingIncrementsByQuestion = new Map<
		string,
		{ seen: number; correct: number; incorrect: number }
	>();
	const validatedAnswers: CompleteTheorySessionAnswer[] = [];

	for (const item of normalizedAnswers) {
		const row = sessionQuestionMap.get(item.sessionQuestionId);
		if (!row) continue;
		if (row.questionId !== item.questionId) continue;

		const question = getQuestionByIdForLanguage(language, row.questionId);
		if (!question) continue;

		const selectedOption = question.options.find(
			(option) => option.id === item.selectedOptionId,
		);
		if (!selectedOption) continue;

		const answeredAt = item.answeredAt || now;
		const isCorrect = selectedOption.isCorrect;

		validatedAnswers.push({
			sessionQuestionId: row.id,
			questionId: row.questionId,
			selectedOptionId: selectedOption.id,
			isCorrect,
			answeredAt,
		});

		if (!row.selectedOptionId) {
			const increment = pendingIncrementsByQuestion.get(row.questionId) ?? {
				seen: 0,
				correct: 0,
				incorrect: 0,
			};
			increment.seen += 1;
			if (isCorrect) increment.correct += 1;
			else increment.incorrect += 1;
			pendingIncrementsByQuestion.set(row.questionId, increment);
		}

		const rowAnsweredAt = normalizeTimestamp(row.answeredAt);
		const nextAnsweredAt = normalizeTimestamp(answeredAt);
		if (!row.selectedOptionId || nextAnsweredAt >= rowAnsweredAt) {
			row.selectedOptionId = selectedOption.id;
			row.isCorrect = isCorrect;
			row.answeredAt = answeredAt;
		}

		const latest = latestByQuestion.get(row.questionId);
		if (!latest || nextAnsweredAt >= normalizeTimestamp(latest.answeredAt)) {
			latestByQuestion.set(row.questionId, {
				isCorrect,
				answeredAt,
			});
		}
	}

	for (const [questionId, latest] of latestByQuestion.entries()) {
		const base = localStatsMap.get(questionId);
		const increment = pendingIncrementsByQuestion.get(questionId) ?? {
			seen: 0,
			correct: 0,
			incorrect: 0,
		};

		let correctCount = toCount(base?.correctCount) + increment.correct;
		let incorrectCount = toCount(base?.incorrectCount) + increment.incorrect;
		if (latest.isCorrect) {
			correctCount = Math.max(1, correctCount);
		} else {
			incorrectCount = Math.max(1, incorrectCount);
		}

		localStatsMap.set(questionId, {
			questionId,
			seenCount: Math.max(1, toCount(base?.seenCount) + increment.seen),
			correctCount,
			incorrectCount,
			lastIsCorrect: latest.isCorrect,
			lastAnsweredAt: latest.answeredAt,
		});
	}

	session.scoreCorrect = session.questions.filter(
		(item) => item.selectedOptionId && item.isCorrect === true,
	).length;
	session.scoreIncorrect = session.questions.filter(
		(item) => item.selectedOptionId && item.isCorrect === false,
	).length;
	session.finishedAt = now;
	sessionMap.set(session.id, session);

	await Promise.all([
		writeLocalSessions(userId, sessionMap),
		writeLocalStats(userId, localStatsMap),
	]);

	const touchedQuestionIds = [...latestByQuestion.keys()];
	if (syncRemote) {
		try {
			await syncSessionToSupabase({
				userId,
				session,
				touchedQuestionIds,
				statsMap: localStatsMap,
				answers: validatedAnswers,
				finishedAt: now,
			});
		} catch (error) {
			if (!shouldIgnoreSyncError(error)) throw error;
		}
	}

	return {
		scoreCorrect: session.scoreCorrect,
		scoreIncorrect: session.scoreIncorrect,
		finishedAt: now,
	};
}
