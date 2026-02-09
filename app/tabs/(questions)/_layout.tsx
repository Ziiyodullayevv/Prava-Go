import React from "react";
import { Stack } from "expo-router";
import { QuestionProvider } from "./question-context";

export default function QuestionsLayout() {
	return (
		<QuestionProvider>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="index" />
				<Stack.Screen name="[id]" />
				<Stack.Screen name="result" />
			</Stack>
		</QuestionProvider>
	);
}
