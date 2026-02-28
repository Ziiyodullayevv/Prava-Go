import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import TabBarButton from "@/components/TabBarButton";
import React, { useEffect, useRef, useState } from "react";
import { BlurView, BlurTargetView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";

function colorWithAlpha(color: string, alpha: number) {
	const normalized = color.trim();
	if (normalized.startsWith("rgb(")) {
		const values = normalized
			.replace("rgb(", "")
			.replace(")", "")
			.split(",")
			.map((item) => item.trim())
			.slice(0, 3);
		if (values.length === 3) {
			return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
		}
	}

	if (normalized.startsWith("#")) {
		const hex = normalized.slice(1);
		const fullHex =
			hex.length === 3
				? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
				: hex;
		if (fullHex.length === 6) {
			const r = Number.parseInt(fullHex.slice(0, 2), 16);
			const g = Number.parseInt(fullHex.slice(2, 4), 16);
			const b = Number.parseInt(fullHex.slice(4, 6), 16);
			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		}
	}

	return color;
}

export function CustomTabBar({
	state,
	descriptors,
	navigation,
}: BottomTabBarProps) {
	const blurTargetRef = useRef<React.ElementRef<typeof View> | null>(null);
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;
	const [dimensions, setDimensions] = useState({ height: 20, width: 100 });
	const indicatorInset = 9;
	const indicatorHeight = Math.max(0, dimensions.height - 14);

	const buttonWidth = dimensions.width / state.routes.length;
	const indicatorWidth = Math.max(0, buttonWidth - indicatorInset * 2);
	const tabbarBottom = 20;
	const tabbarHorizontalInset = 50;
	const tabbarRadius = 100;
	const bottomGradientHeight = Math.max(80, dimensions.height + 24);

	const onTabbarLayout = (e: LayoutChangeEvent) => {
		setDimensions({
			height: e.nativeEvent.layout.height,
			width: e.nativeEvent.layout.width,
		});
	};

	const tabPositionX = useSharedValue(0);

	useEffect(() => {
		tabPositionX.value = withTiming(
			buttonWidth * state.index + indicatorInset,
			{
				duration: 240,
				easing: Easing.out(Easing.cubic),
			},
		);
	}, [buttonWidth, indicatorInset, state.index, tabPositionX]);

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [{ translateX: tabPositionX.value }],
		};
	});

	return (
		<>
			<LinearGradient
				pointerEvents="none"
				colors={
					isDark
						? ["rgba(255,255,255,0)", "rgba(255,255,255,0.12)"]
						: ["rgba(0,0,0,0)", "rgba(0,0,0,0.22)"]
				}
				start={{ x: 0.5, y: 0 }}
				end={{ x: 0.5, y: 1 }}
				style={[
					styles.bottomGradient,
					{
						height: bottomGradientHeight,
					},
				]}
			/>
			<View
				onLayout={onTabbarLayout}
				style={[
					styles.tabbar,
					{
						bottom: tabbarBottom,
						marginHorizontal: tabbarHorizontalInset,
						borderRadius: tabbarRadius,
						backgroundColor: colorWithAlpha(palette.tabsBackground, 0.2),
					},
				]}
			>
				<BlurTargetView
					ref={blurTargetRef}
					pointerEvents="none"
					style={styles.blurTarget}
				/>
				<BlurView
					pointerEvents="none"
					tint={isDark ? "dark" : "light"}
					intensity={80}
					blurMethod="dimezisBlurView"
					blurTarget={blurTargetRef}
					style={styles.blurOverlay}
				/>
				<LinearGradient
					pointerEvents="none"
					colors={
						isDark
							? [
									"rgba(255,255,255,0.10)",
									"rgba(255,255,255,0.03)",
									"rgba(255,255,255,0)",
								]
							: [
									"rgba(255,255,255,0.30)",
									"rgba(255,255,255,0.08)",
									"rgba(0,0,0,0.04)",
								]
					}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.innerGradient}
				/>
				<Animated.View
					style={[
						animatedStyle,
						{
							position: "absolute",
							backgroundColor: colorWithAlpha(palette.tabIconSelected, 0.1),
							borderRadius: 30,
							left: 0,
							top: (dimensions.height - indicatorHeight) / 2,
							height: indicatorHeight,
							width: indicatorWidth,
						},
					]}
				/>
				{state.routes.map((route, index) => {
					const { options } = descriptors[route.key];
					const label =
						typeof options.tabBarLabel === "string"
							? options.tabBarLabel
							: typeof options.title === "string"
								? options.title
								: route.name;

					const isFocused = state.index === index;
					const tintColor = isFocused
						? palette.tabIconSelected
						: palette.tabIconDefault;
					const icon = options.tabBarIcon?.({
						focused: isFocused,
						color: tintColor,
						size: 22,
					});

					const onPress = () => {
						const event = navigation.emit({
							type: "tabPress",
							target: route.key,
							canPreventDefault: true,
						});

						if (!isFocused && !event.defaultPrevented) {
							navigation.navigate(route.name, route.params);
						}
					};

					const onLongPress = () => {
						navigation.emit({
							type: "tabLongPress",
							target: route.key,
						});
					};

					return (
						<TabBarButton
							key={route.key}
							onPress={onPress}
							onLongPress={onLongPress}
							style={styles.tabBarItem}
							isFocused={isFocused}
							accessibilityLabel={options.tabBarAccessibilityLabel}
							testID={options.tabBarButtonTestID}
							tintColor={tintColor}
							icon={icon}
							label={label}
						/>
					);
				})}
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	bottomGradient: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
	},
	tabbar: {
		position: "absolute",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "transparent",
		overflow: "hidden",
		paddingVertical: 10,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowRadius: 10,
		shadowOpacity: 0.1,
	},
	blurOverlay: {
		...StyleSheet.absoluteFillObject,
		borderRadius: 100,
	},
	blurTarget: {
		...StyleSheet.absoluteFillObject,
		borderRadius: 100,
	},
	innerGradient: {
		...StyleSheet.absoluteFillObject,
		borderRadius: 100,
	},
	tabBarItem: {
		flex: 1,
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
	},
});
