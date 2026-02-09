export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
	// Ensure that reloading on `/modal` keeps a back button present.
	initialRouteName: "(tabs)",
};

import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";
import { Stack } from "expo-router";


export default function AppLayout() {
	const { colorMode, isReady } = useAppTheme();
  if (!isReady) return null;

  const isDark = colorMode === "dark";
  const bg = isDark ? Colors.dark.background : Colors.light.background;

	return (
		<Stack  screenOptions={{
        contentStyle: { backgroundColor: bg },
      }}>
			<Stack.Screen options={{ headerShown: false }} name="(tabs)" />
			<Stack.Screen options={{ headerShown: false }} name="(questions)" />
			<Stack.Screen options={{ headerShown: false }} name="user-profile" />
		</Stack>
	);
}
