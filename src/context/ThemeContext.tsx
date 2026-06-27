import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme, Platform } from "react-native";
import { Colors } from "@/constants/colors";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
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
    AsyncStorage.setItem("theme_mode", newMode).then(() => {
      // Tizim ranglarini darhol o'zgartiramiz
      updateGlobalColors(newMode === "system" ? (systemColorScheme === "dark" ? "dark" : "light") : newMode);
      
      // Veb-brauzerda o'zgarishlarni darhol qo'llash uchun sahifani yangilaymiz:
      if (Platform.OS === "web") {
        window.location.reload();
      } else {
        // Mobil qurilmalarda darhol ishlashi uchun NativeModules orqali reload yoki alert
        const { NativeModules } = require("react-native");
        if (NativeModules.DevSettings) {
          NativeModules.DevSettings.reload();
        }
      }
    });
  }, [systemColorScheme]);

  const isDark = mode === "system" ? systemColorScheme === "dark" : mode === "dark";

  useEffect(() => {
    updateGlobalColors(isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode must be used within ThemeProvider");
  return ctx;
}

// Global Colors update helper (for inline styles and new renders)
function updateGlobalColors(theme: "light" | "dark") {
  const lightColors = {
    primary: "#83a383",
    primaryDark: "#678867",
    primaryDarker: "#4D694D",
    primaryForeground: "#FFFFFF",
    primarySoft: "rgba(131, 163, 131, 0.15)",
    primaryTint: "rgba(131, 163, 131, 0.08)",
    background: "#FFFFFF",
    backgroundAlt: "#F4F4F5",
    card: "#F4F4F5",
    cardElevated: "#FFFFFF",
    border: "#E4E4E7",
    borderStrong: "#D4D4D8",
    text: "#18181B",
    textMuted: "#71717A",
    textSubtle: "#A1A1AA",
    star: "#F5B301",
    danger: "#EF4444",
    dangerSoft: "rgba(239, 68, 68, 0.15)",
    success: "#10B981",
    successSoft: "rgba(16, 185, 129, 0.15)",
    warning: "#F59E0B",
    warningSoft: "rgba(245, 158, 11, 0.15)",
    info: "#3B82F6",
    infoSoft: "rgba(59, 130, 246, 0.15)",
    white: "#FFFFFF",
    black: "#000000",
    overlay: "rgba(0, 0, 0, 0.4)",
    skeleton: "#E4E4E7",
    shadowColor: "#000000",
  };

  const darkColors = {
    primary: "#83a383",
    primaryDark: "#678867",
    primaryDarker: "#4D694D",
    primaryForeground: "#18181B",
    primarySoft: "rgba(131, 163, 131, 0.15)",
    primaryTint: "rgba(131, 163, 131, 0.08)",
    background: "#18181B",
    backgroundAlt: "#18181B",
    card: "#27272A",
    cardElevated: "#27272A",
    border: "#3F3F46",
    borderStrong: "#52525B",
    text: "#F4F4F5",
    textMuted: "#A1A1AA",
    textSubtle: "#71717A",
    star: "#F5B301",
    danger: "#EF4444",
    dangerSoft: "rgba(239, 68, 68, 0.15)",
    success: "#10B981",
    successSoft: "rgba(16, 185, 129, 0.15)",
    warning: "#F59E0B",
    warningSoft: "rgba(245, 158, 11, 0.15)",
    info: "#3B82F6",
    infoSoft: "rgba(59, 130, 246, 0.15)",
    white: "#FFFFFF",
    black: "#000000",
    overlay: "rgba(0, 0, 0, 0.65)",
    skeleton: "#27272A",
    shadowColor: "#000000",
  };

  const activeColors = theme === "dark" ? darkColors : lightColors;
  Object.assign(Colors, activeColors);
}
