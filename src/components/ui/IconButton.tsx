import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";

import { type ColorPalette } from "@/constants/colors";
import { HIT_SLOP, radius, shadow } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  /** Oq, soyali doira (xarita/galereya ustidagi tugmalar). */
  surface?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  size = 22,
  color,
  surface = false,
  haptic = true,
  style,
}: IconButtonProps) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={() => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [
        styles.base,
        surface && styles.surface,
        surface && shadow.sm,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? Colors.text} />
    </Pressable>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", padding: 6 },
  surface: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: Colors.cardElevated,
  },
  pressed: { opacity: 0.7 },
});
