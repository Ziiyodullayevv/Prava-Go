/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
	light: {
		text: "#11181C",
		background: "#fff",
		tabsBackground: "#f3f2f4",
		tint: tintColorLight,
		icon: "#77d777",
		tabIconDefault: "#687076",
		tabIconSelected: tintColorLight,
	},
	dark: {
		text: "#ECEDEE",
		background: "#252525",
		tabsBackground: "#2b2b2b",
		tint: tintColorDark,
		icon: "#77d777",
		tabIconDefault: "#9BA1A6",
		tabIconSelected: tintColorDark,
	},
};
