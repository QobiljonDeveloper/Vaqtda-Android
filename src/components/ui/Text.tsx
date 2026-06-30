import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from "react-native";

import { fontFor, fontSize, fontWeight } from "@/constants/theme";
import { useColors } from "@/context/ThemeContext";

export type TextVariant =
  | "display"
  | "h1"
  | "h2"
  | "title"
  | "subtitle"
  | "body"
  | "bodyStrong"
  | "caption"
  | "label";

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
  muted?: boolean;
}

const VARIANT: Record<TextVariant, TextStyle> = {
  display: { fontSize: fontSize.display, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  h1: { fontSize: fontSize.xxxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.4 },
  h2: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.regular },
  bodyStrong: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  caption: { fontSize: fontSize.sm, fontWeight: fontWeight.regular },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.3 },
};

/** Izchil tipografiya. variant + color/muted/center qisqartmalari. */
export function Text({
  variant = "body",
  color,
  center,
  muted,
  style,
  ...rest
}: AppTextProps) {
  const Colors = useColors();
  // style'da fontWeight bo'lsa — variant emas, o'sha og'irlik oilasini ishlatamiz,
  // shunda matn to'g'ri qalinlikda Plus Jakarta Sans bilan chiqadi.
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const weight = flat?.fontWeight ?? VARIANT[variant].fontWeight;
  return (
    <RNText
      style={[
        VARIANT[variant],
        { color: color ?? (muted ? Colors.textMuted : Colors.text) },
        center && { textAlign: "center" },
        style,
        { fontFamily: fontFor(weight) },
      ]}
      {...rest}
    />
  );
}
