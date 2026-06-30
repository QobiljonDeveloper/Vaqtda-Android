// Web ilovaning brend ranglari (globals.css'dan) + booking.com darajasidagi
// sayqal uchun kengaytirilgan token'lar. 'Soft Dark' mavzusi.
import { Platform } from "react-native";

// Stitch dizayn tizimi — Material 3 palitra (brend yashili #406749 / #8fb996).
export const lightColors = {
  primary: "#406749",
  primaryDark: "#2F5239",
  primaryDarker: "#244A2F",
  primaryForeground: "#FFFFFF",
  primarySoft: "rgba(143, 185, 150, 0.28)",
  primaryTint: "rgba(143, 185, 150, 0.12)",
  background: "#F9FAF5",
  backgroundAlt: "#F3F4EF",
  card: "#F3F4EF",
  cardElevated: "#FFFFFF",
  border: "#E2E3DE",
  borderStrong: "#C1C8BF",
  text: "#1A1C1A",
  textMuted: "#424942",
  textSubtle: "#727971",
  star: "#F5B301",
  danger: "#BA1A1A",
  dangerSoft: "rgba(186, 26, 26, 0.12)",
  success: "#10B981",
  successSoft: "rgba(16, 185, 129, 0.15)",
  warning: "#F59E0B",
  warningSoft: "rgba(245, 158, 11, 0.15)",
  info: "#44617C",
  infoSoft: "rgba(68, 97, 124, 0.15)",
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(0, 0, 0, 0.4)",
  skeleton: "#E8E8E4",
  shadowColor: "#000000",
};

export const darkColors = {
  primary: "#A3C0A2",
  primaryDark: "#8FB996",
  primaryDarker: "#6E9A77",
  primaryForeground: "#18181B",
  primarySoft: "rgba(163, 192, 162, 0.20)",
  primaryTint: "rgba(163, 192, 162, 0.10)",
  background: "#18181B",
  backgroundAlt: "#18181B",
  card: "#27272A",
  cardElevated: "#2E2E31",
  border: "#3F3F46",
  borderStrong: "#52525B",
  text: "#E4E4E7",
  textMuted: "#A1A1AA",
  textSubtle: "#71717A",
  star: "#F5B301",
  danger: "#EF4444",
  dangerSoft: "rgba(239, 68, 68, 0.18)",
  success: "#10B981",
  successSoft: "rgba(16, 185, 129, 0.15)",
  warning: "#F59E0B",
  warningSoft: "rgba(245, 158, 11, 0.15)",
  info: "#7895B2",
  infoSoft: "rgba(120, 149, 178, 0.18)",
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

// Reaktiv tema uchun palitra tipi. lightColors/darkColors bir xil kalitlarga ega.
export type ColorPalette = typeof lightColors;

// Eski (komponent bo'lmagan) kodlar uchun global mutable obyekt.
// Komponentlar buni EMAS, `useColors()` / `useThemedStyles()` ni ishlatishi kerak.
// ThemeContext tema o'zgarganda buni ham yangilab turadi (xavfsizlik to'ri).
export const Colors: ColorPalette = initialTheme === "light" ? { ...lightColors } : { ...darkColors };

export type ColorToken = keyof typeof Colors;

