import React from "react";
import { Pressable, View } from "react-native";
import { BellRing, ChevronRight } from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { CustomSwitch } from "@/components/CustomSwitch";
import { RowItem, ThemeColors } from "../types";

type SettingsRowsCardProps = {
	rows: RowItem[];
	colors: ThemeColors;
	pushEnabled: boolean;
	onTogglePush: () => void;
	onSetPushEnabled: (value: boolean) => void;
	pushTitle: string;
	pushSubtitle?: string;
};

export function SettingsRowsCard({
	rows,
	colors,
	pushEnabled,
	onTogglePush,
	onSetPushEnabled,
	pushTitle,
	pushSubtitle,
}: SettingsRowsCardProps) {
	return (
		<Box className="mt-3 rounded-3xl shadow-soft-5 bg-card overflow-hidden">
			{rows.map((item, index) => {
				const ItemIcon = item.icon;
				const isLast = index === rows.length - 1;

				return (
					<Pressable
						key={item.id}
						onPress={item.onPress}
						style={({ pressed }) => ({
							backgroundColor: pressed
								? colors.pressedRowBg
								: "transparent",
						})}
						android_ripple={{ color: colors.pressedRowBg }}
					>
						<Box className="px-4 py-4 flex-row items-center">
							<Box className="h-10 w-10 rounded-xl bg-card-custom shadow-soft-5 items-center justify-center">
								<ItemIcon size={22} color={colors.iconColor} strokeWidth={1.9} />
							</Box>

							<Box className="ml-4 flex-1 pr-2" style={{ minWidth: 0 }}>
								<Heading className="text-sm font-semibold" style={{ flexShrink: 1 }}>
									{item.title}
								</Heading>
								{item.subtitle ? (
									<Text
										className="mt-1 text-[12px] leading-5 text-muted-foreground"
										style={{ flexShrink: 1 }}
									>
										{item.subtitle}
									</Text>
								) : null}
							</Box>

							<ChevronRight size={22} color={colors.iconColor} />
						</Box>
						{!isLast ? <Divider className="mx-4" /> : null}
					</Pressable>
				);
			})}

			{rows.length > 0 ? <Divider className="mx-4" /> : null}
			<Pressable
				onPress={onTogglePush}
				style={({ pressed }) => ({
					backgroundColor: pressed ? colors.pressedRowBg : "transparent",
				})}
				android_ripple={{ color: colors.pressedRowBg }}
			>
				<Box className="px-4 py-4 flex-row items-center">
					<Box className="h-10 w-10 rounded-xl bg-card-custom shadow-soft-5 items-center justify-center">
						<BellRing size={22} color={colors.iconColor} strokeWidth={1.9} />
					</Box>

					<Box className="ml-4 flex-1 pr-2" style={{ minWidth: 0 }}>
						<Heading className="text-sm font-semibold" style={{ flexShrink: 1 }}>
							{pushTitle}
						</Heading>
						{pushSubtitle ? (
							<Text
								className="mt-1 text-[12px] leading-5 text-muted-foreground"
								style={{ flexShrink: 1 }}
							>
								{pushSubtitle}
							</Text>
						) : null}
					</Box>

					<View pointerEvents="box-only">
						<CustomSwitch
							value={pushEnabled}
							onValueChange={onSetPushEnabled}
							trackOnColor={colors.activeColor}
							trackOffColor={colors.inactiveColor}
							borderColor={colors.inactiveColor}
							thumbColor={colors.switchThumbColor}
						/>
					</View>
				</Box>
			</Pressable>
		</Box>
	);
}
