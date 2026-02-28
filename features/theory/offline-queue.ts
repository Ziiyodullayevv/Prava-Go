import AsyncStorage from "@react-native-async-storage/async-storage";

const OFFLINE_QUEUE_VERSION = 1;

type QueueEnvelope<T> = {
	version: number;
	data: T;
};

export type OfflineSessionAnswer = {
	sessionQuestionId: string;
	questionId: string;
	selectedOptionId: string;
	isCorrect: boolean;
	answeredAt: string;
};

export type PendingSessionCompletion = {
	kind: "complete_session";
	userId: string;
	sessionId: string;
	answers: OfflineSessionAnswer[];
	queuedAt: string;
};

function getQueueKey(userId: string) {
	return `queue:theory:pending:${userId}`;
}

async function readQueue(userId: string): Promise<PendingSessionCompletion[]> {
	const raw = await AsyncStorage.getItem(getQueueKey(userId));
	if (!raw) return [];

	try {
		const parsed = JSON.parse(raw) as QueueEnvelope<PendingSessionCompletion[]>;
		if (!parsed || parsed.version !== OFFLINE_QUEUE_VERSION) return [];
		return Array.isArray(parsed.data) ? parsed.data : [];
	} catch {
		return [];
	}
}

async function writeQueue(userId: string, items: PendingSessionCompletion[]) {
	const envelope: QueueEnvelope<PendingSessionCompletion[]> = {
		version: OFFLINE_QUEUE_VERSION,
		data: items,
	};
	await AsyncStorage.setItem(getQueueKey(userId), JSON.stringify(envelope));
}

function mergeAnswers(
	current: OfflineSessionAnswer[],
	next: OfflineSessionAnswer[],
): OfflineSessionAnswer[] {
	const merged = new Map<string, OfflineSessionAnswer>();

	for (const item of current) {
		merged.set(item.sessionQuestionId, item);
	}

	for (const item of next) {
		merged.set(item.sessionQuestionId, item);
	}

	return [...merged.values()].sort((a, b) =>
		a.sessionQuestionId.localeCompare(b.sessionQuestionId),
	);
}

export async function enqueueSessionCompletion(
	item: PendingSessionCompletion,
) {
	const queue = await readQueue(item.userId);
	const existingIndex = queue.findIndex(
		(current) =>
			current.kind === item.kind &&
			current.userId === item.userId &&
			current.sessionId === item.sessionId,
	);

	if (existingIndex === -1) {
		queue.push(item);
		await writeQueue(item.userId, queue);
		return;
	}

	const existing = queue[existingIndex];
	queue[existingIndex] = {
		...existing,
		answers: mergeAnswers(existing.answers, item.answers),
		queuedAt: item.queuedAt,
	};
	await writeQueue(item.userId, queue);
}

export async function removeQueuedSessionCompletion(
	userId: string,
	sessionId: string,
) {
	const queue = await readQueue(userId);
	const filtered = queue.filter((item) => item.sessionId !== sessionId);
	if (filtered.length === queue.length) return;
	await writeQueue(userId, filtered);
}

export async function flushSessionCompletionQueue(
	userId: string,
	processor: (item: PendingSessionCompletion) => Promise<void>,
) {
	const queue = await readQueue(userId);
	if (queue.length === 0) return { synced: 0, pending: 0 };

	const remaining: PendingSessionCompletion[] = [];
	let synced = 0;

	for (const item of queue) {
		try {
			await processor(item);
			synced += 1;
		} catch {
			remaining.push(item);
		}
	}

	await writeQueue(userId, remaining);
	return { synced, pending: remaining.length };
}
