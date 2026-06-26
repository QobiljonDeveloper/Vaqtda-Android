import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { Colors } from "@/constants/colors";
import { fontSize, fontWeight, radius } from "@/constants/theme";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  haptic?: boolean;
  style?: ViewStyle;
}

const HEIGHT: Record<Size, number> = { sm: 40, md: 50, lg: 56 };
const FONT: Record<Size, number> = { sm: fontSize.sm, md: fontSize.md, lg: fontSize.lg };

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  iconRight,
  haptic = true,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const palette = getPalette(variant);

  const handlePress = () => {
    if (isDisabled) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.border ? 1.5 : 0,
        },
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={FONT[size] + 4} color={palette.fg} />}
          <Text style={[styles.label, { color: palette.fg, fontSize: FONT[size] }]}>
            {label}
          </Text>
          {iconRight && (
            <Ionicons name={iconRight} size={FONT[size] + 4} color={palette.fg} />
          )}
        </View>
      )}
    </Pressable>
  );
}

function getPalette(variant: Variant): { bg: string; fg: string; border?: string } {
  switch (variant) {
    case "secondary":
      return { bg: Colors.primarySoft, fg: Colors.primaryDarker };
    case "outline":
      return { bg: "transparent", fg: Colors.text, border: Colors.borderStrong };
    case "ghost":
      return { bg: "transparent", fg: Colors.primaryDark };
    case "danger":
      return { bg: Colors.danger, fg: Colors.white };
    case "primary":
    default:
      return { bg: Colors.primary, fg: Colors.primaryForeground };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  fullWidth: { alignSelf: "stretch" },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontWeight: fontWeight.bold },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.5 },
});
