import React from "react";
import { Pressable } from "react-native";
import type { ComponentType } from "react";
import { ChevronRight, CircleCheck, CircleHelp } from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

type TopicIcon = ComponentType<{
	size?: number;
	color?: string;
	strokeWidth?: number;
}>;

type TopicCardProps = {
	title: string;
	subtitle: string;
	progressLabel: string;
	completed: boolean;
	icon: TopicIcon;
	textColor: string;
	mutedColor: string;
	onPress: () => void;
};

export function TopicCard({
	title,
	subtitle,
	progressLabel,
	completed,
	icon: Icon,
	textColor,
	mutedColor,
	onPress,
}: TopicCardProps) {
	return (
		<Pressable onPress={onPress}>
			<Box className="rounded-3xl bg-card shadow-hard-5 px-4 py-4">
				<Box className="flex-row items-start">
					<Box className="rounded-xl w-[45px] bg-background h-[45px] items-center justify-center">
						<Icon size={24} color={textColor} strokeWidth={1.9} />
					</Box>

					<Box className="ml-4 flex-1">
						<Heading className="text-base font-semibold">{title}</Heading>
						<Text className="mt-1 text-sm text-foreground/70">{subtitle}</Text>

						<Box className="mt-3 flex-row items-center gap-2">
							{completed ? (
								<CircleCheck size={18} color="#0f8b5f" />
							) : (
								<CircleHelp size={18} color={mutedColor} />
							)}
							<Text
								className={["text-sm", completed ? "text-emerald-700" : ""].join(
									" ",
								)}
								style={completed ? undefined : { color: mutedColor }}
							>
								{progressLabel}
							</Text>
						</Box>
					</Box>

					<Box className="-mr-1 mt-1">
						<ChevronRight size={22} color={mutedColor} />
					</Box>
				</Box>
			</Box>
		</Pressable>
	);
}
