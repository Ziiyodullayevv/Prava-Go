import React from "react";
import { Pressable } from "react-native";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { CustomSwitch } from "@/components/CustomSwitch";

type ToggleRowProps = {
	label: string;
	value: boolean;
	onValueChange: (value: boolean) => void;
	withDivider?: boolean;
};

export function ToggleRow({
	label,
	value,
	onValueChange,
	withDivider = true,
}: ToggleRowProps) {
	return (
		<Pressable onPress={() => onValueChange(!value)}>
			<Box
				className={[
					"h-14 flex-row items-center justify-between",
					withDivider ? "border-b border-foreground/10" : "",
				].join(" ")}
			>
				<Text className="text-base font-normal">{label}</Text>
				<CustomSwitch value={value} onValueChange={onValueChange} />
			</Box>
		</Pressable>
	);
}
