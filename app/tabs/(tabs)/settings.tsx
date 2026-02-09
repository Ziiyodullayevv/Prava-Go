import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import {
	BellRing,
	ChevronRight,
	CircleHelp,
	LogOut,
	Lock,
	Moon,
	UserRound,
} from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Avatar, AvatarFallbackText, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";

type RowItem = {
	id: string;
	label: string;
	icon: React.ComponentType<{
		size?: number;
		color?: string;
		strokeWidth?: number;
	}>;
	onPress: () => void;
};

export default function SettingsScreen() {
	const router = useRouter();
	const [pushEnabled, setPushEnabled] = useState(true);

	const { colorMode, setColorMode, toggleColorMode } = useAppTheme();
	const isDarkMode = colorMode === "dark";

	const iconColor = isDarkMode ? Colors.dark.text : Colors.light.text;
	const activeColor = isDarkMode ? Colors.dark.icon : Colors.light.icon;
	const inactiveColor = isDarkMode
		? Colors.dark.tabIconDefault
		: Colors.light.tabIconDefault;
	const switchThumbColor = isDarkMode
		? Colors.dark.text
		: Colors.light.background;
	const pressedRowBg = isDarkMode
		? Colors.dark.tabsBackground
		: Colors.light.tabsBackground;

	const rows = useMemo<RowItem[]>(
		() => [
			{
				id: "profile",
				label: "User Profile",
				icon: UserRound,
				onPress: () => router.push("/tabs/user-profile"),
			},
			{
				id: "password",
				label: "Change Password",
				icon: Lock,
				onPress: () => {},
			},
			{
				id: "faq",
				label: "FAQs",
				icon: CircleHelp,
				onPress: () => {},
			},
		],
		[router]
	);

	return (
		<Box className="flex-1 bg-background pt-safe px-5">
			<Box className="pt-1 pb-2 bg-background">
				<Heading className="text-2xl font-semibold">Settings</Heading>
			</Box>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
			>
				<Box className="rounded-3xl bg-card p-4 flex-row items-center justify-between">
					<Box className="flex-row items-center gap-3 flex-1">
						<Avatar className="w-[64px] bg-foreground h-[64px]">
							<AvatarFallbackText className="!text-background text-2xl">
								Ziyodullayev
							</AvatarFallbackText>
							<AvatarImage
								source={{
									uri: "https://images.ctfassets.net/xjcz23wx147q/iegram9XLv7h3GemB5vUR/0345811de2da23fafc79bd00b8e5f1c6/Max_Rehkopf_200x200.jpeg",
								}}
							/>
						</Avatar>

						<Box className="flex-1 gap-1">
							<Text className="text-primary/60 text-base">Welcome</Text>
							<Heading numberOfLines={1} className="text-xl font-semibold">
								Ziyodullayev
							</Heading>
						</Box>
					</Box>

					<Pressable
						className="w-[40px] h-[40px] items-center justify-center rounded-full bg-background/70"
						onPress={() => {
							// logout logic
						}}
						style={({ pressed }) => ({
							opacity: pressed ? 0.78 : 1,
							transform: [{ scale: pressed ? 0.95 : 1 }],
						})}
						android_ripple={{
							color: pressedRowBg,
							borderless: true,
							radius: 20,
						}}
					>
						<LogOut size={22} color={iconColor} />
					</Pressable>
				</Box>

				<Box className="mt-3 rounded-3xl bg-card overflow-hidden">
					{rows.map((item, index) => {
						const ItemIcon = item.icon;
						const isLast = index === rows.length - 1;

						return (
							<Pressable
								key={item.id}
								onPress={item.onPress}
								style={({ pressed }) => ({
									backgroundColor: pressed ? pressedRowBg : "transparent",
								})}
								android_ripple={{ color: pressedRowBg }}
							>
								<Box
									className={[
										"px-4 py-5 flex-row items-center justify-between",
										!isLast ? "border-b border-background" : "",
									].join(" ")}
								>
									<Box className="flex-row items-center gap-3 flex-1">
										<ItemIcon size={22} color={iconColor} strokeWidth={1.8} />
										<Heading className="text-base font-normal">
											{item.label}
										</Heading>
									</Box>

									<ChevronRight size={21} color={iconColor} />
								</Box>
							</Pressable>
						);
					})}

					{/* Push notifications row */}
					<Pressable
						onPress={() => setPushEnabled((prev) => !prev)}
						style={({ pressed }) => ({
							backgroundColor: pressed ? pressedRowBg : "transparent",
						})}
						android_ripple={{ color: pressedRowBg }}
					>
						<Box className="px-4 py-5 flex-row items-center justify-between border-t border-background">
							<Box className="flex-row items-center gap-3 flex-1">
								<BellRing size={22} color={iconColor} strokeWidth={1.8} />
								<Heading className="text-base font-normal">
									Push Notification
								</Heading>
							</Box>

							{/* IMPORTANT: switch press should not bubble to row press */}
							<View pointerEvents="box-only">
								<Switch
									value={pushEnabled}
									onValueChange={setPushEnabled}
									trackColor={{ false: inactiveColor, true: activeColor }}
									thumbColor={switchThumbColor}
									ios_backgroundColor={inactiveColor}
								/>
							</View>
						</Box>
					</Pressable>

					{/* Dark mode row */}
					<Pressable
						onPress={toggleColorMode}
						style={({ pressed }) => ({
							backgroundColor: pressed ? pressedRowBg : "transparent",
						})}
						android_ripple={{ color: pressedRowBg }}
					>
						<Box className="px-4 py-5 flex-row items-center justify-between border-t border-background">
							<Box className="flex-row items-center gap-3 flex-1">
								<Moon size={22} color={iconColor} strokeWidth={1.8} />
								<Heading className="text-base font-normal">Dark Mode</Heading>
							</Box>

							{/* IMPORTANT: switch press should not bubble to row press */}
							<View pointerEvents="box-only">
								<Switch
									value={isDarkMode}
									onValueChange={(value) =>
										setColorMode(value ? "dark" : "light")
									}
									trackColor={{ false: inactiveColor, true: activeColor }}
									thumbColor={switchThumbColor}
									ios_backgroundColor={inactiveColor}
								/>
							</View>
						</Box>
					</Pressable>
				</Box>

				<Box className="mt-6 rounded-3xl bg-card px-6 py-8 items-center">
					<Text className="text-center text-base leading-7">
						If you have any other query you can reach out to us.
					</Text>

					<Pressable
						className="mt-5 rounded-xl px-2 py-1"
						onPress={() => {
							// open WhatsApp link
						}}
						style={({ pressed }) => ({
							opacity: pressed ? 0.75 : 1,
							transform: [{ scale: pressed ? 0.98 : 1 }],
						})}
						android_ripple={{ color: pressedRowBg }}
					>
						<Text className="text-lg font-semibold underline text-primary">
							WhatsApp Us
						</Text>
					</Pressable>
				</Box>
			</ScrollView>
		</Box>
	);
}
