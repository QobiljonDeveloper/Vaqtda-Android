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
  xl: 20,
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

const iosShadow = (opacity: number, blur: number, y: number): ViewStyle => ({
  shadowColor: Colors.shadowColor,
  shadowOpacity: opacity,
  shadowRadius: blur,
  shadowOffset: { width: 0, height: y },
});

export const shadow: Record<"none" | "sm" | "md" | "lg", ViewStyle> = {
  none: {},
  sm:
    (Platform.select({
      ios: iosShadow(0.06, 6, 2),
      android: { elevation: 2, shadowColor: Colors.shadowColor },
      default: {},
    }) as ViewStyle) ?? {},
  md:
    (Platform.select({
      ios: iosShadow(0.1, 16, 6),
      android: { elevation: 5, shadowColor: Colors.shadowColor },
      default: {},
    }) as ViewStyle) ?? {},
  lg:
    (Platform.select({
      ios: iosShadow(0.16, 28, 12),
      android: { elevation: 10, shadowColor: Colors.shadowColor },
      default: {},
    }) as ViewStyle) ?? {},
};

/** Kichik bosiladigan elementlar uchun standart hitSlop. */
export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 68 }) ?? 0;
export const MaxContentWidth = 800;
