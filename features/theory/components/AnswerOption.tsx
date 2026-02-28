import React from "react";
import { Pressable } from "react-native";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";

export type AnswerOptionStatus =
	| "default"
	| "selected"
	| "correct"
	| "wrong"
	| "hint-correct";

type AnswerOptionProps = {
	label: string;
	text: string;
	status: AnswerOptionStatus;
	disabled?: boolean;
	onPress: () => void;
};

export function AnswerOption({
	label,
	text,
	status,
	disabled = false,
	onPress,
}: AnswerOptionProps) {
	const isWrong = status === "wrong";
	const isCorrect = status === "correct";
	const isHint = status === "hint-correct";
	const isSelected = status === "selected";

	return (
		<Pressable disabled={disabled} onPress={onPress}>
			<Box
				className={[
					"rounded-3xl bg-card-custom border shadow-soft-1 px-4 py-4 flex-row items-center gap-3",
					isWrong
						? "border-destructive bg-destructive/50"
						: isCorrect
							? "border-brand bg-brand/15"
							: isHint
								? "border-brand/80 bg-brand/5"
								: isSelected
									? "border-foreground/40 bg-foreground/5"
									: "border-border",
				].join(" ")}
			>
				<Box
					className={[
						"h-8 w-8 rounded-full bg-background items-center justify-center border",
						isWrong
							? "border-destructive bg-destructive/10"
							: isCorrect || isHint
								? "border-brand bg-brand/10"
								: isSelected
									? "border-foreground/50 bg-foreground/5"
									: "border-border",
					].join(" ")}
				>
					<Text
						className={[
							"text-sm font-semibold",
							isWrong ? "text-destructive" : "",
							isCorrect || isHint ? "text-brand" : "",
						].join(" ")}
					>
						{label}
					</Text>
				</Box>

				<Text className="flex-1 text-base font-normal">{text}</Text>
			</Box>
		</Pressable>
	);
}
