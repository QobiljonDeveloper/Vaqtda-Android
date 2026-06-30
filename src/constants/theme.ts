// Dizayn tizimi token'lari — booking.com darajasidagi izchil sayqal uchun.
// Brend ranglari constants/colors.ts'da. Bu yerda: radius, spacing, typografiya, soya.

import { Platform, type TextStyle, type ViewStyle } from "react-native";

import { Colors } from "@/constants/colors";

export { Colors };

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24, // Stitch: kartalar 24px burchak
  xxl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 34,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const satisfies Record<string, TextStyle["fontWeight"]>;

// ── Brend shrifti: Plus Jakarta Sans (Stitch dizayni) ──
// RN'da maxsus shrift og'irligini fontWeight EMAS, fontFamily belgilaydi.
// Oila nomlari _layout'da useFonts() bilan ro'yxatdan o'tadi.
export const fontFamily = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
} as const;

/** fontWeight qiymatini ("400".."800") mos Plus Jakarta Sans oilasiga aylantiradi. */
export function fontFor(weight?: TextStyle["fontWeight"]): string {
  switch (weight) {
    case "800":
    case "900":
      return fontFamily.extrabold;
    case "700":
    case "bold":
      return fontFamily.bold;
    case "600":
      return fontFamily.semibold;
    case "500":
      return fontFamily.medium;
    default:
      return fontFamily.regular;
  }
}

const iosShadow = (opacity: number, blur: number, y: number): ViewStyle => ({
  shadowColor: Colors.shadowColor,
  shadowOpacity: opacity,
  shadowRadius: blur,
  shadowOffset: { width: 0, height: y },
});

// Stitch: yumshoq ambient soya (0 4px 20px rgba(0,0,0,0.05)). Android'da yengil elevation.
export const shadow: Record<"none" | "sm" | "md" | "lg", ViewStyle> = {
  none: {},
  sm:
    (Platform.select({
      ios: iosShadow(0.04, 12, 3),
      android: { elevation: 2, shadowColor: Colors.shadowColor },
      default: {},
    }) as ViewStyle) ?? {},
  md:
    (Platform.select({
      ios: iosShadow(0.05, 20, 4),
      android: { elevation: 3, shadowColor: Colors.shadowColor },
      default: {},
    }) as ViewStyle) ?? {},
  lg:
    (Platform.select({
      ios: iosShadow(0.1, 28, 8),
      android: { elevation: 6, shadowColor: Colors.shadowColor },
      default: {},
    }) as ViewStyle) ?? {},
};

/** Kichik bosiladigan elementlar uchun standart hitSlop. */
export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 68 }) ?? 0;
export const MaxContentWidth = 800;
