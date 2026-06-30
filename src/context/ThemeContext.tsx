import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme, StyleSheet } from "react-native";
import { Colors, lightColors, darkColors, type ColorPalette } from "@/constants/colors";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: ColorPalette;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem("theme_mode").then((val) => {
      if (val === "light" || val === "dark" || val === "system") {
        setModeState(val);
      }
    });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem("theme_mode", newMode).catch(() => {});
  }, []);

  const isDark = mode === "system" ? systemColorScheme === "dark" : mode === "dark";

  const colors = isDark ? darkColors : lightColors;

  // Komponent bo'lmagan eski kodlar global `Colors`'ni o'qiydi — uni sinxron tutamiz.
  useEffect(() => {
    Object.assign(Colors, colors);
  }, [colors]);

  const value = useMemo(() => ({ mode, setMode, isDark, colors }), [mode, setMode, isDark, colors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode must be used within ThemeProvider");
  return ctx;
}

/** Joriy tema ranglarini qaytaradi. Tema o'zgarganda komponent qayta render bo'ladi. */
export function useColors(): ColorPalette {
  return useThemeMode().colors;
}

/**
 * Tema-mos stillar yaratadi. `factory` — ranglarni qabul qilib StyleSheet qaytaradigan funksiya.
 * Tema o'zgarganda stillar avtomatik qayta hisoblanadi.
 *
 * Misol:
 *   const styles = useThemedStyles(makeStyles);
 *   const makeStyles = (Colors: ColorPalette) => StyleSheet.create({ ... });
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ColorPalette) => T
): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
}
