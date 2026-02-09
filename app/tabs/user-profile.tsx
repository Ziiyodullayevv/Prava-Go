import React from "react";
import { Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Camera, ChevronLeft } from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import {
	Avatar,
	AvatarFallbackText,
	AvatarImage,
} from "@/components/ui/avatar";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";

const DEFAULT_AVATAR =
	"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80";

export default function UserProfileScreen() {
	const router = useRouter();
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const iconColor = isDark ? Colors.dark.text : Colors.light.text;

	return (
		<Box className="flex-1 bg-background pt-safe px-6">
			<Box className="flex-row items-center h-12">
				<Pressable
					onPress={() => router.back()}
					className="w-10 h-10 items-center justify-center"
					style={({ pressed }) => ({
						opacity: pressed ? 0.6 : 1,
						transform: [{ scale: pressed ? 0.98 : 1 }],
					})}
				>
					<ChevronLeft size={24} color={iconColor} />
				</Pressable>

				<Box className="flex-1 items-center pr-10">
					<Heading className="text-xl font-semibold">User Profile</Heading>
				</Box>
			</Box>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 36 }}
			>
				<Box className="items-center mt-6">
					<Box className="items-center relative">
						<Box className="w-[132px] h-[132px] rounded-full items-center justify-center bg-card/60 border border-border/40">
							<Avatar className="w-[116px] h-[116px]">
								<AvatarFallbackText>John Doe</AvatarFallbackText>
								<AvatarImage
									source={{
										uri: DEFAULT_AVATAR,
									}}
								/>
							</Avatar>
						</Box>
						<Box className="absolute right-1 bottom-1 w-[34px] h-[34px] rounded-full bg-background items-center justify-center border border-border shadow-xs">
							<Camera size={18} color={iconColor} />
						</Box>
					</Box>
				</Box>

				<Box className="mt-8 gap-4">
					<Box className="gap-2">
						<Text className="text-sm text-primary/60 font-medium">
							First Name
						</Text>
						<Input className="h-12 rounded-full border-border/50 bg-background px-4">
							<InputField
								defaultValue="John"
								placeholder="John"
								className="text-base"
							/>
						</Input>
					</Box>

					<Box className="gap-2">
						<Text className="text-sm text-primary/60 font-medium">
							Last Name
						</Text>
						<Input className="h-12 rounded-full border-border/50 bg-background px-4">
							<InputField
								defaultValue="Doe"
								placeholder="Doe"
								className="text-base"
							/>
						</Input>
					</Box>

					<Box className="gap-2">
						<Text className="text-sm text-primary/60 font-medium">
							E-Mail
						</Text>
						<Input className="h-12 rounded-full border-border/50 bg-background px-4">
							<InputField
								defaultValue="johndoe@gmail.com"
								placeholder="johndoe@gmail.com"
								keyboardType="email-address"
								autoCapitalize="none"
								className="text-base"
							/>
						</Input>
					</Box>

					<Box className="gap-2">
						<Text className="text-sm text-primary/60 font-medium">
							Mobile
						</Text>
						<Input className="h-12 rounded-full border-border/50 bg-background px-4">
							<InputField
								defaultValue="+91-123456789"
								placeholder="+91-123456789"
								keyboardType="phone-pad"
								className="text-base"
							/>
						</Input>
					</Box>
				</Box>

				<Button className="mt-10 h-12 rounded-full bg-primary">
					<ButtonText className="text-lg font-semibold text-primary-foreground">
						SAVE
					</ButtonText>
				</Button>
			</ScrollView>
		</Box>
	);
}
