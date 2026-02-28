import React from "react";
import { Stack } from "expo-router";

import { QuestionProvider } from "../question-context";

export default function ExamLayout() {
	return (
		<QuestionProvider>
			<Stack screenOptions={{ headerShown: false }} />
		</QuestionProvider>
	);
}
