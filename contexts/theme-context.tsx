import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ColorMode = "light" | "dark";
type ThemeContextValue = {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  isReady: boolean; // optional: loading gate
};

const STORAGE_KEY = "app:colorMode";
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorMode, setColorMode] = useState<ColorMode>("dark");
  const [isReady, setIsReady] = useState(false);

  // 1) load saved mode on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "light" || saved === "dark") setColorMode(saved);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  // 2) persist on change (when ready)
  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(STORAGE_KEY, colorMode).catch(() => {});
  }, [colorMode, isReady]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colorMode,
      setColorMode,
      toggleColorMode: () => setColorMode((p) => (p === "dark" ? "light" : "dark")),
      isReady,
    }),
    [colorMode, isReady]
  );

  // optional: theme flash bo‘lmasin desang, ready bo‘lmaguncha render qilmaslik
  if (!isReady) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
}
