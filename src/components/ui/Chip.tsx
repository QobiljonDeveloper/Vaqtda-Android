import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";

import { Colors } from "@/constants/colors";
import { fontSize, fontWeight, radius, spacing } from "@/constants/theme";

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: "sm" | "md";
}

/** Tanlanadigan pill (kategoriya, sana, davomiylik, filtrlar). */
export function Chip({ label, active = false, onPress, icon, size = "md" }: ChipProps) {
  const h = size === "sm" ? 34 : 40;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { height: h },
        active ? styles.active : styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={size === "sm" ? 14 : 16}
          color={active ? Colors.primaryForeground : Colors.textMuted}
        />
      )}
      <Text
        style={[
          styles.text,
          { fontSize: size === "sm" ? fontSize.sm : fontSize.md },
          active ? styles.textActive : styles.textInactive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
  },
  active: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  inactive: { backgroundColor: Colors.white, borderColor: Colors.border },
  pressed: { opacity: 0.85 },
  text: { fontWeight: fontWeight.semibold },
  textActive: { color: Colors.primaryForeground },
  textInactive: { color: Colors.textMuted },
});
