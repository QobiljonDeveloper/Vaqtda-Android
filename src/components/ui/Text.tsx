import { Text as RNText, type TextProps, type TextStyle } from "react-native";

import { Colors } from "@/constants/colors";
import { fontSize, fontWeight } from "@/constants/theme";

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
  return (
    <RNText
      style={[
        VARIANT[variant],
        { color: color ?? (muted ? Colors.textMuted : Colors.text) },
        center && { textAlign: "center" },
        style,
      ]}
      {...rest}
    />
  );
}
