import React from "react";
import { Stack } from "expo-router";

export default function QuestionsLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" />
			<Stack.Screen name="exam" />
			<Stack.Screen name="bookmarks/index" />
			<Stack.Screen name="mistakes/index" />
			<Stack.Screen name="mistakes/[packId]" />
			<Stack.Screen name="marathon/index" />
			<Stack.Screen name="theory/index" />
			<Stack.Screen name="theory/[slug]" />
			<Stack.Screen name="theory/test/[sessionId]" />
			<Stack.Screen name="theory/[slug]/questions" />
			<Stack.Screen name="theory/[slug]/result" />
		</Stack>
	);
}
