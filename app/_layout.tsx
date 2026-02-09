import "@/global.css";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from "@react-navigation/native";
import {
  ThemeProvider as AppThemeProvider,
  useAppTheme,
} from "@/contexts/theme-context";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as SystemUI from "expo-system-ui";
import { Colors } from "@/constants/Colors";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  return (
    <AppThemeProvider>
      <RootLayoutNav fontsLoaded={loaded} />
    </AppThemeProvider>
  );
}

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { colorMode, isReady } = useAppTheme();

  const isDark = colorMode === "dark";
  const bg = isDark ? Colors.dark.background : Colors.light.background;

  // 1) Android transition paytida ko‘rinadigan "window background" ni theme ga moslab qo‘yadi
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(bg).catch(() => {});
  }, [bg]);

  // 2) Splash faqat font + theme ready bo‘lganda yopilsin (flash bo‘lmasin)
  useEffect(() => {
    if (fontsLoaded && isReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isReady]);

  if (!fontsLoaded || !isReady) return null;

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: bg, card: bg } }
    : {
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: bg, card: bg },
      };

  return (
    <NavThemeProvider value={navTheme}>
      <GluestackUIProvider mode={colorMode}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Slot />
      </GluestackUIProvider>
    </NavThemeProvider>
  );
}
