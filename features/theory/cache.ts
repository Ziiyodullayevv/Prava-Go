import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_VERSION = 1;
const memoryCache = new Map<string, string>();

type CacheEnvelope<T> = {
	version: number;
	savedAt: number;
	data: T;
};

function buildEnvelope<T>(data: T): CacheEnvelope<T> {
	return {
		version: CACHE_VERSION,
		savedAt: Date.now(),
		data,
	};
}

export function getTheoryOverviewCacheKey(userId: string) {
	return `cache:theory:overview:default:${userId}`;
}

export function getTheoryOverviewLangCacheKey(userId: string, language: string) {
	return `cache:theory:overview:${language}:${userId}`;
}

export function getTheoryTopicDetailCacheKey(userId: string, slug: string) {
	return `cache:theory:topic:default:${userId}:${slug}`;
}

export function getTheoryTopicDetailLangCacheKey(
	userId: string,
	slug: string,
	language: string,
) {
	return `cache:theory:topic:${language}:${userId}:${slug}`;
}

export function getTheorySessionCacheKey(userId: string, sessionId: string) {
	return `cache:theory:session:default:${userId}:${sessionId}`;
}

export function getTheorySessionLangCacheKey(
	userId: string,
	sessionId: string,
	language: string,
) {
	return `cache:theory:session:${language}:${userId}:${sessionId}`;
}

export function getTheoryTopicQuestionBankCacheKey(topicId: string) {
	return `cache:theory:topic-bank:default:${topicId}`;
}

export function getTheoryTopicQuestionBankLangCacheKey(
	topicId: string,
	language: string,
) {
	return `cache:theory:topic-bank:${language}:${topicId}`;
}

export async function writeCache<T>(key: string, data: T) {
	const envelope = buildEnvelope(data);
	const raw = JSON.stringify(envelope);
	memoryCache.set(key, raw);
	await AsyncStorage.setItem(key, raw);
}

export function peekMemoryCache<T>(key: string) {
	const raw = memoryCache.get(key);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as CacheEnvelope<T>;
		if (!parsed || parsed.version !== CACHE_VERSION) return null;
		return parsed.data;
	} catch {
		return null;
	}
}

export async function peekCache<T>(key: string) {
	const memoryValue = peekMemoryCache<T>(key);
	if (memoryValue) return memoryValue;

	const raw = await AsyncStorage.getItem(key);
	if (!raw) return null;
	memoryCache.set(key, raw);

	try {
		const parsed = JSON.parse(raw) as CacheEnvelope<T>;
		if (!parsed || parsed.version !== CACHE_VERSION) return null;
		return parsed.data;
	} catch {
		return null;
	}
}

export async function readCache<T>(key: string, maxAgeMs: number) {
	const memoryRaw = memoryCache.get(key);
	if (memoryRaw) {
		try {
			const parsed = JSON.parse(memoryRaw) as CacheEnvelope<T>;
			if (parsed && parsed.version === CACHE_VERSION) {
				if (Date.now() - parsed.savedAt <= maxAgeMs) {
					return parsed.data;
				}
			}
		} catch {
			// ignore memory cache parse errors
		}
	}

	const raw = await AsyncStorage.getItem(key);
	if (!raw) return null;
	memoryCache.set(key, raw);

	try {
		const parsed = JSON.parse(raw) as CacheEnvelope<T>;
		if (!parsed || parsed.version !== CACHE_VERSION) return null;
		if (Date.now() - parsed.savedAt > maxAgeMs) return null;
		return parsed.data;
	} catch {
		return null;
	}
}
