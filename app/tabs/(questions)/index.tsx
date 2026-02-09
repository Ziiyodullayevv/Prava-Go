import React from "react";
import { Pressable, ScrollView } from "react-native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { ChevronLeft, Lock } from "lucide-react-native";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import { QUESTIONS } from "@/data/questions";
import { useAppTheme } from "@/contexts/theme-context";

export default function DetailsScreen() {
	const lockColor = "#f97316";
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const defaultColor = isDark ? Colors.dark.text : Colors.light.text;
	const router = useRouter();

	return (
		<Box className="flex-1 bg-background">
			<Box className="h-[300px] relative">
				<Box className="pt-safe absolute z-[100] top-0 left-0 right-0">
					<Box className="flex-row items-center px-5 h-14">
						<Button
							onPress={() => router.back()}
							variant="ghost"
							className="bg-card h-14 w-14 rounded-full"
						>
							<ChevronLeft color={defaultColor} />
						</Button>
						<Box className="flex-1 items-center">
							<Heading className="text-2xl text-white font-semibold">
								Categories B
							</Heading>
						</Box>
						<Box className="w-14" />
					</Box>
				</Box>
				<Image
					alt="image"
					className="object-cover  w-full h-full"
					source={{
						uri: "https://media.architecturaldigest.com/photos/6679b599132b6a297f93f7ff/master/w_1600%2Cc_limit/EMBARGO-BUGATTI-World-Premiere-Presskit-Images-02.jpg",
					}}
				/>
			</Box>

			<Box className="flex-1 px-5 -mt-[25px] rounded-t-[30px] bg-background">
				<ScrollView
					className="flex-1"
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
				>
					<Box className="gap-3 py-5">
						{QUESTIONS.map((item) => (
							<Pressable
								key={`${item.id}`}
								onPress={() => router.push(`/tabs/(questions)/${item.id}`)}
							>
								<Box className="bg-card px-5 py-4 flex-row justify-between items-center rounded-2xl">
									<Box className="flex-1 gap-1 pr-4">
										<Text className="text-sm text-primary/60">
											Question {item.id}
										</Text>
										<Heading
											numberOfLines={1}
											ellipsizeMode="tail"
											className="text-base font-normal"
										>
											{item.question}
										</Heading>
									</Box>

									<Box className="w-[35px] h-[35px] rounded-full bg-orange-500/20 items-center justify-center">
										<Lock size={16} color={lockColor} />
									</Box>
								</Box>
							</Pressable>
						))}
					</Box>
				</ScrollView>
			</Box>
		</Box>
	);
}
