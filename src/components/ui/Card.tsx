import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { Colors } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Soyali, ko'tarilgan ko'rinish (booking.com kartalari). */
  elevated?: boolean;
  padded?: boolean;
  style?: ViewStyle;
}

export function Card({ children, onPress, elevated = false, padded = true, style }: CardProps) {
  const cardStyle: ViewStyle[] = [
    styles.card,
    elevated ? styles.elevated : styles.flat,
    elevated ? shadow.md : null,
    padded ? styles.padded : null,
    style,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: "hidden" },
  flat: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  elevated: { backgroundColor: Colors.cardElevated, borderWidth: 1, borderColor: Colors.border },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});
