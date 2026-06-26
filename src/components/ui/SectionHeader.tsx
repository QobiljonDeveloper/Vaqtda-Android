import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";
import { spacing } from "@/constants/theme";
import { Text } from "@/components/ui/Text";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text variant="title">{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8} style={styles.action}>
          <Text variant="bodyStrong" color={Colors.primaryDark}>
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primaryDark} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 2 },
});
