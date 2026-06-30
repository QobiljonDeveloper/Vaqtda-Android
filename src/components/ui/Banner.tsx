import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { type ColorPalette } from "@/constants/colors";
import { radius, spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { Text } from "@/components/ui/Text";

type BannerVariant = "success" | "error";

interface BannerProps {
  variant: BannerVariant;
  message: string;
  /** Yopish tugmasini ko'rsatadi. */
  onDismiss?: () => void;
  style?: ViewStyle;
}

/** Inline xabar paneli (Alert o'rniga) — success/error, temaga mos. */
export function Banner({ variant, message, onDismiss, style }: BannerProps) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);

  const isSuccess = variant === "success";
  const tint = isSuccess ? Colors.success : Colors.danger;
  const bg = isSuccess ? Colors.successSoft : Colors.dangerSoft;
  const icon = isSuccess ? "checkmark-circle" : "alert-circle";

  return (
    <View style={[styles.base, { backgroundColor: bg, borderColor: tint }, style]}>
      <Ionicons name={icon} size={18} color={tint} style={styles.icon} />
      <Text variant="caption" color={tint} style={styles.message}>
        {message}
      </Text>
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color={tint} />
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (Colors: ColorPalette) =>
  StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    icon: { marginTop: 1 },
    message: { flex: 1, fontWeight: "600", lineHeight: 18 },
  });
