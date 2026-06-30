import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { Colors, type ColorPalette } from "@/constants/colors";
import { spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "sparkles-outline",
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={34} color={Colors.primaryDark} />
      </View>
      <Text variant="subtitle" center>
        {title}
      </Text>
      {!!subtitle && (
        <Text variant="body" muted center style={styles.sub}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} fullWidth={false} size="md" />
        </View>
      )}
    </View>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", padding: spacing.xxxl, gap: spacing.sm },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  sub: { maxWidth: 280 },
  action: { marginTop: spacing.md },
});
