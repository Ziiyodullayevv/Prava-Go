import { useEffect, type ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";

import { Box } from "@/components/ui/box";
import { useAppTheme } from "@/contexts/theme-context";

type GradientIconFrameProps = {
	children: ReactNode;
	size?: number;
	borderRadius?: number;
	colors?: [string, string, string];
	innerBackgroundColor?: string;
	innerBorderRadius?: number;
	shine?: boolean;
	style?: ViewStyle;
};

export function GradientIconFrame({
	children,
	size = 40,
	borderRadius = 12,
	colors,
	innerBackgroundColor,
	innerBorderRadius = 11.5,
	shine = false,
	style,
}: GradientIconFrameProps) {
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const gradientColors: [string, string, string] = isDark
		? [
				"rgba(92,92,92,0.56)",
				"rgba(37,37,37,0.72)",
				"rgba(82,82,82,0.5)",
			]
		: [
				"rgba(205,205,205,0.82)",
				"rgba(245,245,245,1)",
				"rgba(210,210,210,0.72)",
			];
	const resolvedGradientColors = colors ?? gradientColors;
	const innerBackground = innerBackgroundColor ?? (isDark ? "#202020" : "#f5f5f5");
	const shineX = useSharedValue(-size * 1.4);
	const shineStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: shineX.value }, { rotate: "22deg" }],
	}));

	useEffect(() => {
		if (!shine) {
			shineX.value = -size * 1.4;
			return;
		}

		shineX.value = withRepeat(
			withSequence(
				withTiming(size * 2.35, {
					duration: 1650,
					easing: Easing.out(Easing.cubic),
				}),
				withDelay(
					1050,
					withTiming(-size * 1.4, {
						duration: 0,
					}),
				),
			),
			-1,
			false,
		);
	}, [shine, shineX, size]);

	return (
		<Box
			className="shadow-sm"
			style={[
				{
					borderRadius,
					height: size,
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: isDark ? 0.14 : 0.08,
					shadowRadius: 3,
					width: size,
					elevation: 1,
				},
				style,
			]}
		>
			<LinearGradient
				colors={resolvedGradientColors}
				start={{ x: 1, y: 1 }}
				end={{ x: 0, y: 0 }}
				style={{
					borderRadius,
					height: size,
					overflow: "hidden",
					padding: 0.5,
					width: size,
				}}
			>
				<Box
					className="flex-1 items-center justify-center"
					style={{ backgroundColor: innerBackground, borderRadius: innerBorderRadius }}
				>
					{children}
				</Box>
				{shine ? (
					<Animated.View
						pointerEvents="none"
						style={[
							{
								height: size * 1.9,
								left: -size * 0.78,
								position: "absolute",
								top: -size * 0.45,
								width: size * 0.58,
							},
							shineStyle,
						]}
					>
						<LinearGradient
							colors={[
								"rgba(255,255,255,0)",
								"rgba(255,255,255,0.08)",
								"rgba(255,255,255,0.42)",
								"rgba(255,255,255,0.1)",
								"rgba(255,255,255,0)",
							]}
							locations={[0, 0.26, 0.48, 0.64, 1]}
							start={{ x: 0, y: 0.5 }}
							end={{ x: 1, y: 0.5 }}
							style={{ flex: 1 }}
						/>
					</Animated.View>
				) : null}
			</LinearGradient>
		</Box>
	);
}
