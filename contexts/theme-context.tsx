import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ColorMode = "light" | "dark";
type ThemePreference = "system" | ColorMode;

type ThemeContextValue = {
	colorMode: ColorMode;
	themePreference: ThemePreference;
	setColorMode: (mode: ColorMode) => void;
	setThemePreference: (mode: ThemePreference) => void;
	toggleColorMode: () => void;
	isReady: boolean;
};

const STORAGE_KEY = "app:themePreference";
const LEGACY_STORAGE_KEY = "app:colorMode";
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const systemColorScheme = useColorScheme();
	const [themePreference, setThemePreferenceState] =
		useState<ThemePreference>("system");
	const [isReady, setIsReady] = useState(false);
	const colorMode: ColorMode =
		themePreference === "system"
			? systemColorScheme === "dark"
				? "dark"
				: "light"
			: themePreference;

	// 1) load saved mode on mount
	useEffect(() => {
		(async () => {
			try {
				const savedPreference = await AsyncStorage.getItem(STORAGE_KEY);
				if (
					savedPreference === "system" ||
					savedPreference === "light" ||
					savedPreference === "dark"
				) {
					setThemePreferenceState(savedPreference);
					return;
				}

				const legacySavedPreference = await AsyncStorage.getItem(
					LEGACY_STORAGE_KEY,
				);
				if (
					legacySavedPreference === "light" ||
					legacySavedPreference === "dark"
				) {
					setThemePreferenceState(legacySavedPreference);
				}
			} finally {
				setIsReady(true);
			}
		})();
	}, []);

	// 2) persist on change (when ready)
	useEffect(() => {
		if (!isReady) return;
		AsyncStorage.setItem(STORAGE_KEY, themePreference).catch(() => {});
	}, [themePreference, isReady]);

	const value = useMemo<ThemeContextValue>(
		() => ({
			colorMode,
			themePreference,
			setColorMode: (mode) => setThemePreferenceState(mode),
			setThemePreference: setThemePreferenceState,
			toggleColorMode: () =>
				setThemePreferenceState((currentPreference) => {
					const currentMode =
						currentPreference === "system"
							? systemColorScheme === "dark"
								? "dark"
								: "light"
							: currentPreference;

					return currentMode === "dark" ? "light" : "dark";
				}),
			isReady,
		}),
		[colorMode, isReady, systemColorScheme, themePreference],
	);

	if (!isReady) return null;

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
	return ctx;
}
