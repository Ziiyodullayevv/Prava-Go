import React, { createContext, useContext, useMemo, useState } from "react";
import { QUESTIONS } from "@/data/questions";

type AnswersMap = Record<number, number>;

type QuestionContextValue = {
	answers: AnswersMap;
	setAnswer: (questionId: number, optionIndex: number) => void;
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
	const [answers, setAnswers] = useState<AnswersMap>({});

	const value = useMemo<QuestionContextValue>(
		() => ({
			answers,
			setAnswer: (questionId, optionIndex) =>
				setAnswers((prev) => ({ ...prev, [questionId]: optionIndex })),
			reset: () => setAnswers({}),
			total: QUESTIONS.length,
		}),
		[answers]
	);

	return (
		<QuestionContext.Provider value={value}>
			{children}
		</QuestionContext.Provider>
	);
}
