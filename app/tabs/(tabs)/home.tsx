import React from "react";
import { Pressable, ScrollView } from "react-native";

import { Box } from "@/components/ui/box";
import {
	Avatar,
	AvatarFallbackText,
	AvatarImage,
} from "@/components/ui/avatar";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/Themed";
import { Badge, BadgeText } from "@/components/ui/badge";
import { VStack } from "@/components/ui/vstack";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import { Image } from "@/components/ui/image";

import {
	Bell,
	ChevronRight,
	Search,
	SlidersHorizontal,
} from "lucide-react-native";
import { Colors } from "@/constants/Colors";
import { Link } from "expo-router";
import { useAppTheme } from "@/contexts/theme-context";

export default function HomeScreen() {
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const activeIcon = isDark ? Colors.dark.icon : Colors.light.icon;
	const defaultIcon = isDark ? Colors.dark.text : Colors.light.text;
	return (
		<Box className=" px-5 pt-safe bg-background flex-1">
			{/* Top header */}
			<Box className="flex-row ios:mt-2 android:mt-5 justify-between mb-4 items-center">
				<Box className="flex-row gap-4 items-center">
					<Avatar className="p-[1px] bg-primary w-[60px] h-[60px]">
						<AvatarFallbackText>Jane Doe</AvatarFallbackText>
						<AvatarImage
							source={{
								uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
							}}
						/>
					</Avatar>

					<Box className="flex-col shadow-hard-5 gap-1">
						<Heading className="text-2xl">Jons R</Heading>
						<Text className="font-medium font-mono !text-primary/50 text-lg">
							Good Morning
						</Text>
					</Box>
				</Box>

				<VStack className="relative">
					<Badge className="absolute z-10 top-0 right-0 h-[22px] w-[22px] bg-red-500 rounded-full items-center justify-center">
						<BadgeText className="text-white">2</BadgeText>
					</Badge>

					<Box className="w-[60px] h-[60px] bg-card rounded-full items-center justify-center">
						<Bell size={30} strokeWidth={1} color={defaultIcon} />
					</Box>
				</VStack>
			</Box>

			<ScrollView
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
				contentContainerStyle={{ paddingBottom: 24 }}
			>
				{/* Search */}
				<Box className="mt-1 mb-4 flex-row items-center bg-card justify-between rounded-2xl h-[55px] px-5">
					<Box className="flex-row items-center flex-1">
						<Search strokeWidth={1} size={28} color={defaultIcon} />

						<Input className="flex-1 flex-row justify-center items-center border-0 !bg-transparent">
							<InputField
								className="text-lg"
								placeholder="Search anything..."
							/>
						</Input>
					</Box>

					<SlidersHorizontal strokeWidth={1.5} color={activeIcon} />
				</Box>

				{/* Continue Test */}
				<Heading className="text-2xl mt-1 font-semibold">Continue Test</Heading>

				<Box className="h-44 my-3 relative overflow-hidden rounded-2xl">
					<Box className="absolute h-full items-start justify-between flex-col z-10 p-4">
						<Heading
							numberOfLines={2}
							ellipsizeMode="tail"
							className="max-w-60 text-[28px] !text-white font-semibold"
						>
							Driving Theory Test Prep
						</Heading>

						<Button
							className="rounded-xl bg-[#29ea66] text-black h-11"
							variant="default"
						>
							<ButtonText className="text-lg font-normal">Continue</ButtonText>
						</Button>
					</Box>

					<Image
						className="w-full h-full object-cover"
						source={{
							uri: "https://monikapodbielska.pl/wp-content/uploads/2020/04/porsche-e1588169061412.jpg",
						}}
						alt="image"
					/>
				</Box>

				{/* Choose Test */}
				<Heading className="text-2xl my-3 font-semibold">Choose Test</Heading>

				{/* List */}
				<Box className="gap-2">
					{chooseTest.map((item) => (
						<Link
							key={item.id}
							href={{
								pathname: "/tabs/(questions)",
								params: { id: String(item.id) },
							}}
							asChild
						>
							<Pressable>
								<Box className="bg-card p-3 flex-row justify-between items-center rounded-2xl">
									<Box className="flex-row justify-start items-center gap-4 flex-1">
										<Box className="w-[56px] h-[56px] overflow-hidden rounded-lg">
											<Image
												className="w-full h-full object-cover"
												size="lg"
												source={{ uri: item.image }}
												alt={item.description}
											/>
										</Box>

										<Box className="gap-1 flex-1">
											<Heading
												numberOfLines={1}
												ellipsizeMode="tail"
												className="text-xl font-normal"
											>
												{item.title}
											</Heading>

											<Heading
												numberOfLines={1}
												ellipsizeMode="tail"
												className="text-base text-primary/70 font-normal"
											>
												{item.description}
											</Heading>
										</Box>
									</Box>

									<ChevronRight size={26} color={defaultIcon} />
								</Box>
							</Pressable>
						</Link>
					))}
				</Box>
			</ScrollView>
		</Box>
	);
}

const chooseTest = [
	{
		id: "1",
		image:
			"https://static.vecteezy.com/system/resources/thumbnails/023/980/938/small/close-up-red-luxury-car-on-black-background-with-copy-space-photo.jpg",
		title: "Car",
		description: "(Categories B etc.)",
		href: "/tabs/",
	},
	{
		id: "2",
		image:
			"https://static.vecteezy.com/system/resources/thumbnails/050/357/746/small/a-tight-shot-of-the-rear-spoiler-of-a-silver-sports-car-with-small-vortex-generators-along-the-edge-to-disrupt-and-smooth-out-airflow-for-maximum-downforce-photo.jpg",
		title: "Motorcycle",
		description: "(Categories AA/tc.)",
	},
	{
		id: "3",
		image:
			"https://www.mad4wheels.com/img/free-car-images/mobile/22231/mclaren-artura-spider-mcl39-championship-edition-2026-thumb.jpg",
		title: "Large Goods Vehicles",
		description: "(Categories B etc.)",
	},
];
