import type { SupportedLanguage } from "@/locales/i18n-provider";
import { DEFAULT_LANGUAGE, getCurrentLanguage } from "@/locales/i18n-provider";
import type { SessionQuestionOption } from "./types";
import { resolveQuestionImageUri } from "./question-images";
import { getLocalizedTopicTitle } from "./topic-titles";

type RawQuestion = {
	id: number | string;
	question?: string;
	image_q?: string;
	correct_ans_alls?: string;
	answers?: string[];
	correct_answer?: number | string;
	question_category?: number | string;
	topic?: number | string;
};

export type LocalTopic = {
	id: string;
	slug: string;
	title: string;
	subtitle: string;
	order: number;
	imageKey: string | null;
	questionIds: string[];
};

export type LocalQuestion = {
	id: string;
	topicId: string;
	prompt: string;
	imageUrl: string | null;
	explanation: string | null;
	options: SessionQuestionOption[];
};

type LanguageQuestionBank = {
	topics: LocalTopic[];
	questionsById: Map<string, LocalQuestion>;
	questionsByTopicId: Map<string, LocalQuestion[]>;
	questionIdsByTopicId: Map<string, string[]>;
	questionTopicIdById: Map<string, string>;
	rawQuestionById: Map<string, RawQuestion>;
	topicById: Map<string, LocalTopic>;
	topicBySlug: Map<string, LocalTopic>;
};

const TOPIC_TITLE_PREFIX: Record<SupportedLanguage, string> = {
	"uz-Latn": "Bo'lim",
	"uz-Cyrl": "Бўлим",
	ru: "Раздел",
};

const TOPIC_SUBTITLE: Record<SupportedLanguage, string> = {
	"uz-Latn": "Nazariy savollar",
	"uz-Cyrl": "Назарий саволлар",
	ru: "Теоретические вопросы",
};

const questionBankCache = new Map<SupportedLanguage, LanguageQuestionBank>();
const rawQuestionsCache = new Map<SupportedLanguage, RawQuestion[]>();
const SMALL_TOPIC_THRESHOLD = 10;

type RawQuestionsModule = {
	default?: RawQuestion[];
};

function toRawQuestions(value: unknown): RawQuestion[] {
	if (Array.isArray(value)) return value as RawQuestion[];
	if (
		value &&
		typeof value === "object" &&
		Array.isArray((value as RawQuestionsModule).default)
	) {
		return (value as RawQuestionsModule).default as RawQuestion[];
	}
	return [];
}

function getRawQuestionsForLanguage(language: SupportedLanguage): RawQuestion[] {
	const cached = rawQuestionsCache.get(language);
	if (cached) return cached;

	let loaded: unknown;
	if (language === "uz-Latn") {
		loaded = require("../../locales/langs/uz-Latn/questions.json");
	} else if (language === "uz-Cyrl") {
		loaded = require("../../locales/langs/uz-Cyrl/questions.json");
	} else {
		loaded = require("../../locales/langs/ru/questions.json");
	}

	const normalized = toRawQuestions(loaded);
	rawQuestionsCache.set(language, normalized);
	return normalized;
}

function normalizeText(value: unknown) {
	if (typeof value !== "string") return "";
	return value.trim();
}

function normalizeId(value: unknown, fallback: string) {
	const normalized = String(value ?? "").trim();
	return normalized.length > 0 ? normalized : fallback;
}

function normalizeTopicId(raw: RawQuestion) {
	const byTopic = normalizeId(raw.topic, "");
	if (byTopic) return byTopic;

	const byCategory = normalizeId(raw.question_category, "");
	if (byCategory) return byCategory;

	return "general";
}

function normalizeTopicSlug(topicId: string) {
	return `section-${topicId.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
}

function toOrder(value: string) {
	const parsed = Number(value);
	if (Number.isFinite(parsed)) return Math.floor(parsed);
	return Number.MAX_SAFE_INTEGER;
}

function optionLabel(index: number) {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	if (index >= 0 && index < letters.length) return letters[index];
	return String(index + 1);
}

function toCorrectIndex(value: unknown) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return -1;
	return Math.max(-1, Math.floor(parsed) - 1);
}

function hasValidOptions(raw: RawQuestion) {
	if (!Array.isArray(raw.answers)) return false;
	return raw.answers.some((answer) => normalizeText(answer).length > 0);
}

function buildSmallTopicMergeMap(rawTopicCounts: Map<string, number>) {
	const sortedTopicIds = [...rawTopicCounts.keys()].sort(
		(a, b) => toOrder(a) - toOrder(b) || a.localeCompare(b),
	);
	const mergeMap = new Map<string, string>();
	const isSmallTopic = (topicId: string) =>
		(rawTopicCounts.get(topicId) ?? 0) <= SMALL_TOPIC_THRESHOLD;

	for (let index = 0; index < sortedTopicIds.length; index += 1) {
		const topicId = sortedTopicIds[index];
		if (!isSmallTopic(topicId)) continue;

		let targetTopicId = "";

		for (let prevIndex = index - 1; prevIndex >= 0; prevIndex -= 1) {
			const prevTopicId = sortedTopicIds[prevIndex];
			if (isSmallTopic(prevTopicId)) continue;
			targetTopicId = prevTopicId;
			break;
		}

		if (!targetTopicId) {
			for (
				let nextIndex = index + 1;
				nextIndex < sortedTopicIds.length;
				nextIndex += 1
			) {
				const nextTopicId = sortedTopicIds[nextIndex];
				if (isSmallTopic(nextTopicId)) continue;
				targetTopicId = nextTopicId;
				break;
			}
		}

		if (targetTopicId) {
			mergeMap.set(topicId, targetTopicId);
		}
	}

	return mergeMap;
}

function buildLanguageQuestionBank(
	language: SupportedLanguage,
): LanguageQuestionBank {
	const cached = questionBankCache.get(language);
	if (cached) return cached;

	const rawQuestions = getRawQuestionsForLanguage(language);
	const draftQuestions: Array<{
		id: string;
		topicId: string;
		raw: RawQuestion;
	}> = [];
	const rawTopicCounts = new Map<string, number>();

	for (const item of rawQuestions) {
		const questionId = normalizeId(item.id, "");
		if (!questionId) continue;

		const prompt = normalizeText(item.question);
		if (!prompt) continue;

		if (!hasValidOptions(item)) continue;

		const topicId = normalizeTopicId(item);
		draftQuestions.push({ id: questionId, topicId, raw: item });
		rawTopicCounts.set(topicId, (rawTopicCounts.get(topicId) ?? 0) + 1);
	}

	const mergeMap = buildSmallTopicMergeMap(rawTopicCounts);
	const questionsById = new Map<string, LocalQuestion>();
	const questionsByTopicId = new Map<string, LocalQuestion[]>();
	const rawQuestionById = new Map<string, RawQuestion>();
	const questionIdsByTopicId = new Map<string, string[]>();
	const questionTopicIdById = new Map<string, string>();

	for (const question of draftQuestions) {
		const mergedTopicId = mergeMap.get(question.topicId) ?? question.topicId;
		rawQuestionById.set(question.id, question.raw);
		questionTopicIdById.set(question.id, mergedTopicId);

		const topicQuestionIds = questionIdsByTopicId.get(mergedTopicId) ?? [];
		topicQuestionIds.push(question.id);
		questionIdsByTopicId.set(mergedTopicId, topicQuestionIds);
	}

	for (const [topicId, topicQuestionIds] of questionIdsByTopicId.entries()) {
		topicQuestionIds.sort((a, b) => toOrder(a) - toOrder(b) || a.localeCompare(b));
		questionIdsByTopicId.set(topicId, topicQuestionIds);
	}

	const topicIds = [...questionIdsByTopicId.keys()].sort(
		(a, b) => toOrder(a) - toOrder(b) || a.localeCompare(b),
	);

	const topics: LocalTopic[] = topicIds.map((topicId, index) => ({
		id: topicId,
		slug: normalizeTopicSlug(topicId),
		title:
			getLocalizedTopicTitle(language, topicId) ??
			`${TOPIC_TITLE_PREFIX[language]} ${topicId}`,
		subtitle: TOPIC_SUBTITLE[language],
		order: index + 1,
		imageKey: topicId,
		questionIds: [...(questionIdsByTopicId.get(topicId) ?? [])],
	}));

	const topicById = new Map(topics.map((topic) => [topic.id, topic]));
	const topicBySlug = new Map(topics.map((topic) => [topic.slug, topic]));

	const built: LanguageQuestionBank = {
		topics,
		questionsById,
		questionsByTopicId,
		questionIdsByTopicId,
		questionTopicIdById,
		rawQuestionById,
		topicById,
		topicBySlug,
	};
	questionBankCache.set(language, built);
	return built;
}

function materializeQuestion(
	bank: LanguageQuestionBank,
	questionId: string,
): LocalQuestion | null {
	const cached = bank.questionsById.get(questionId);
	if (cached) return cached;

	const raw = bank.rawQuestionById.get(questionId);
	if (!raw) return null;

	const prompt = normalizeText(raw.question);
	if (!prompt) return null;

	const topicId = bank.questionTopicIdById.get(questionId) ?? normalizeTopicId(raw);
	const answerTexts = Array.isArray(raw.answers) ? raw.answers : [];
	const correctIndex = toCorrectIndex(raw.correct_answer);
	const options: SessionQuestionOption[] = answerTexts
		.map((answerText) => normalizeText(answerText))
		.filter((answerText) => answerText.length > 0)
		.map((text, index) => ({
			id: `${questionId}:${index + 1}`,
			label: optionLabel(index),
			text,
			isCorrect: index === correctIndex,
			order: index + 1,
		}));

	if (options.length === 0) return null;

	const imageKey = normalizeText(raw.image_q);
	const imageUrl = imageKey ? resolveQuestionImageUri(imageKey) : null;
	const question: LocalQuestion = {
		id: questionId,
		topicId,
		prompt,
		imageUrl,
		explanation: normalizeText(raw.correct_ans_alls) || null,
		options,
	};

	bank.questionsById.set(questionId, question);
	return question;
}

function materializeTopicQuestions(
	bank: LanguageQuestionBank,
	topicId: string,
): LocalQuestion[] {
	const cached = bank.questionsByTopicId.get(topicId);
	if (cached) return cached;

	const questionIds = bank.questionIdsByTopicId.get(topicId) ?? [];
	const questions: LocalQuestion[] = [];
	for (const questionId of questionIds) {
		const question = materializeQuestion(bank, questionId);
		if (question) questions.push(question);
	}

	bank.questionsByTopicId.set(topicId, questions);
	return questions;
}

export function getQuestionBankForLanguage(
	language: SupportedLanguage = getCurrentLanguage(),
) {
	return buildLanguageQuestionBank(language);
}

export function getQuestionBankForCurrentLanguage() {
	return buildLanguageQuestionBank(getCurrentLanguage());
}

export function getQuestionByIdForLanguage(
	language: SupportedLanguage,
	questionId: string,
) {
	const bank = buildLanguageQuestionBank(language);
	return materializeQuestion(bank, questionId);
}

export function getQuestionsByTopicForLanguage(
	language: SupportedLanguage,
	topicId: string,
) {
	const bank = buildLanguageQuestionBank(language);
	return materializeTopicQuestions(bank, topicId);
}

export function getQuestionsForCurrentLanguage() {
	const bank = getQuestionBankForCurrentLanguage();
	for (const topic of bank.topics) {
		materializeTopicQuestions(bank, topic.id);
	}
	return bank.questionsById;
}

export function getTopicsForCurrentLanguage() {
	return getQuestionBankForCurrentLanguage().topics;
}

export function getNormalizedLanguage(
	language: string | null | undefined,
): SupportedLanguage {
	if (!language) return getCurrentLanguage();
	if (language === "uz-Latn" || language === "uz-Cyrl" || language === "ru") {
		return language;
	}
	return DEFAULT_LANGUAGE;
}
