import type { SupportedLanguage } from "@/locales/i18n-provider";
import {
	getQuestionBankForLanguage,
	getQuestionByIdForLanguage,
} from "@/features/theory/local-question-bank";

export type LocalizedQuestionItem = {
	id: number;
	sourceQuestionId: string;
	question: string;
	options: string[];
	correctIndex: number;
	imageUrl: string | null;
	explanation: string | null;
};

function toCorrectIndex(options: Array<{ isCorrect: boolean }>) {
	const found = options.findIndex((option) => option.isCorrect);
	return found >= 0 ? found : 0;
}

export function getLocalizedQuestions(
	language: SupportedLanguage,
	limit = 20,
): LocalizedQuestionItem[] {
	const normalizedLimit = Math.max(1, Math.floor(limit));
	const bank = getQuestionBankForLanguage(language);
	const selectedQuestions: Array<
		NonNullable<ReturnType<typeof getQuestionByIdForLanguage>>
	> = [];

	for (const topic of bank.topics) {
		for (const questionId of topic.questionIds) {
			const question = getQuestionByIdForLanguage(language, questionId);
			if (!question) continue;
			selectedQuestions.push(question);
			if (selectedQuestions.length >= normalizedLimit) break;
		}
		if (selectedQuestions.length >= normalizedLimit) break;
	}

	return selectedQuestions.map((question, index) => ({
		id: index + 1,
		sourceQuestionId: question.id,
		question: question.prompt,
		options: question.options.map((option) => option.text),
		correctIndex: toCorrectIndex(question.options),
		imageUrl: question.imageUrl,
		explanation: question.explanation,
	}));
}
