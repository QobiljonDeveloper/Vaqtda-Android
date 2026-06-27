// Web ilovaning brend ranglari (globals.css'dan) + booking.com darajasidagi
// sayqal uchun kengaytirilgan token'lar. 'Soft Dark' mavzusi.
import { Platform } from "react-native";

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

let initialTheme = "dark";

if (Platform.OS === "web" && typeof window !== "undefined") {
  try {
    const stored = window.localStorage.getItem("theme_mode");
    if (stored === "light") {
      initialTheme = "light";
    } else if (stored === "system") {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        initialTheme = "light";
      }
    }
  } catch (e) {}
}

export const Colors = initialTheme === "light" ? { ...lightColors } : { ...darkColors };

export type ColorToken = keyof typeof Colors;

