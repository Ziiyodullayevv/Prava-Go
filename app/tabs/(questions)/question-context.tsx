import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useSegments } from "expo-router";
import { useI18n } from "@/locales/i18n-provider";
import {
	getLocalizedQuestions,
	type LocalizedQuestionItem,
} from "@/features/questions/localized-questions";

type AnswersMap = Record<number, number>;
export type FinishReason = "completed" | "mistake_limit" | "timeout";

type QuestionContextValue = {
	questions: LocalizedQuestionItem[];
	answers: AnswersMap;
	setAnswer: (questionId: number, optionIndex: number) => void;
	startExam: () => void;
	finishExam: (reason: FinishReason) => void;
	startedAt: number | null;
	finishedAt: number | null;
	finishReason: FinishReason | null;
	correctCount: number;
	wrongCount: number;
	answeredCount: number;
	reset: () => void;
	total: number;
};

const QuestionContext = createContext<QuestionContextValue | null>(null);

export function useQuestionStore() {
	const ctx = useContext(QuestionContext);
	if (!ctx) {
		throw new Error("useQuestionStore must be used within QuestionProvider");
	}
	return ctx;
}

export function QuestionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { language } = useI18n();
	const segments = useSegments() as string[];
	const shouldLoadQuestions = useMemo(() => {
		const hasExamSegment = segments.includes("exam");
		const isTheoryQuestionsScreen =
			segments.includes("theory") && segments[segments.length - 1] === "questions";
		return hasExamSegment || isTheoryQuestionsScreen;
	}, [segments]);

	const questions = useMemo(
		() => (shouldLoadQuestions ? getLocalizedQuestions(language, 20) : []),
		[language, shouldLoadQuestions],
	);
	const [answers, setAnswers] = useState<AnswersMap>({});
	const [startedAt, setStartedAt] = useState<number | null>(null);
	const [finishedAt, setFinishedAt] = useState<number | null>(null);
	const [finishReason, setFinishReason] = useState<FinishReason | null>(null);

	useEffect(() => {
		setAnswers({});
		setStartedAt(null);
		setFinishedAt(null);
		setFinishReason(null);
	}, [language]);

	const value = useMemo<QuestionContextValue>(
		() => {
			const counts = questions.reduce(
				(acc, question) => {
					const selected = answers[question.id];
					if (selected === undefined) return acc;

					acc.answered += 1;
					if (selected === question.correctIndex) {
						acc.correct += 1;
					} else {
						acc.wrong += 1;
					}
					return acc;
				},
				{ answered: 0, correct: 0, wrong: 0 },
			);

			return {
				questions,
				answers,
				setAnswer: (questionId, optionIndex) =>
					setAnswers((prev) => ({ ...prev, [questionId]: optionIndex })),
				startExam: () => {
					const now = Date.now();
					setAnswers({});
					setStartedAt(now);
					setFinishedAt(null);
					setFinishReason(null);
				},
				finishExam: (reason) => {
					setFinishReason((prev) => prev ?? reason);
					setFinishedAt((prev) => prev ?? Date.now());
				},
				startedAt,
				finishedAt,
				finishReason,
				correctCount: counts.correct,
				wrongCount: counts.wrong,
				answeredCount: counts.answered,
				reset: () => {
					setAnswers({});
					setStartedAt(null);
					setFinishedAt(null);
					setFinishReason(null);
				},
				total: questions.length,
			};
		},
		[answers, finishReason, finishedAt, questions, startedAt],
	);

	return (
		<QuestionContext.Provider value={value}>
			{children}
		</QuestionContext.Provider>
	);
}
