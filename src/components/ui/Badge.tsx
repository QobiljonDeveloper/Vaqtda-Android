import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { type ColorPalette } from "@/constants/colors";
import { fontFamily, fontSize, fontWeight, radius } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";

export type BadgeTone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
}

const toneMap = (Colors: ColorPalette): Record<BadgeTone, { bg: string; fg: string }> => ({
  primary: { bg: Colors.primarySoft, fg: Colors.primaryDarker },
  success: { bg: Colors.successSoft, fg: Colors.success },
  warning: { bg: Colors.warningSoft, fg: Colors.warning },
  danger: { bg: Colors.dangerSoft, fg: Colors.danger },
  info: { bg: Colors.infoSoft, fg: Colors.info },
  neutral: { bg: Colors.backgroundAlt, fg: Colors.textMuted },
});

export function Badge({ label, tone = "neutral", icon }: BadgeProps) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const c = toneMap(Colors)[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {icon && <Ionicons name={icon} size={12} color={c.fg} />}
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, fontFamily: fontFamily.bold, letterSpacing: 0.2 },
});
