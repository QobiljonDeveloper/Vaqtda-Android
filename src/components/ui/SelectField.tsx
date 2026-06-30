import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { Colors, type ColorPalette } from "@/constants/colors";
import { radius, spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";

export interface SelectOption {
  id: string;
  label: string;
}

interface SelectFieldProps {
  label?: string;
  placeholder: string;
  value: string | null;
  options: SelectOption[];
  onSelect: (id: string) => void;
  sheetTitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function SelectField({
  label,
  placeholder,
  value,
  options,
  onSelect,
  sheetTitle,
  icon,
}: SelectFieldProps) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <View style={styles.wrap}>
      {label && (
        <Text variant="bodyStrong" style={styles.label}>
          {label}
        </Text>
      )}
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        {icon && <Ionicons name={icon} size={18} color={Colors.textMuted} />}
        <Text variant="body" color={selected ? Colors.text : Colors.textSubtle} style={styles.flex} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={sheetTitle ?? label ?? placeholder} scroll>
        <View style={styles.options}>
          {options.map((o) => {
            const active = o.id === value;
            return (
              <Pressable
                key={o.id}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => {
                  onSelect(o.id);
                  setOpen(false);
                }}
              >
                <Text variant="body" color={active ? Colors.primaryDarker : Colors.text} style={styles.flex}>
                  {o.label}
                </Text>
                {active && <Ionicons name="checkmark" size={20} color={Colors.primaryDark} />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  wrap: { gap: 6 },
  flex: { flex: 1 },
  label: { marginLeft: 2 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  options: { paddingBottom: spacing.lg },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  optionActive: { backgroundColor: Colors.primarySoft },
});
