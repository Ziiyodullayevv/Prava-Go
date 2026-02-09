import React from "react";
import { Tabs } from "expo-router";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import {
	Home,
	Clock,
	Settings,
	CarFront,
} from "lucide-react-native";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";

type LucideIconComponent = React.ComponentType<{
	size?: number;
	color?: string;
	strokeWidth?: number;
	style?: any;
}>;

function TabIcon({
	Icon,
	focused,
}: {
	Icon: LucideIconComponent;
	focused: boolean;
}) {
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const defaultIcon = isDark ? Colors.dark.text : Colors.light.text;
	const activeIcon = isDark ? Colors.dark.icon : Colors.light.icon;

	return (
		<Icon
			size={28}
			color={focused ? activeIcon : defaultIcon}
			strokeWidth={focused ? 2 : 1.5}
			style={{ marginBottom: 0, marginTop: 17 }}
		/>
	);
}

export default function TabLayout() {
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const backgroundColor =
		isDark ? Colors.dark.tabsBackground : Colors.light.tabsBackground;

	return (
		<Tabs
			screenOptions={{
				headerShown: useClientOnlyValue(true, false),
				tabBarShowLabel: false,
				tabBarStyle: {
					backgroundColor,
					borderTopColor: "#687076",
					paddingBottom: 12,
				},
			}}
		>
			<Tabs.Screen
				name="home"
				options={{
					headerShown: false,

					tabBarIcon: ({ focused }) => (
						<TabIcon Icon={Home} focused={focused} />
					),
				}}
			/>

			<Tabs.Screen
				name="car"
				options={{
					tabBarIcon: ({ focused }) => (
						<TabIcon Icon={CarFront} focused={focused} />
					),
				}}
			/>

			<Tabs.Screen
				name="history"
				options={{
					tabBarIcon: ({ focused }) => (
						<TabIcon Icon={Clock} focused={focused} />
					),
				}}
			/>

			<Tabs.Screen
				name="settings"
				options={{
					tabBarIcon: ({ focused }) => (
						<TabIcon Icon={Settings} focused={focused} />
					),
				}}
			/>
		</Tabs>
	);
}
