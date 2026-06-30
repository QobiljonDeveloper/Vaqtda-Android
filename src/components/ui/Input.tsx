import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { Colors, type ColorPalette } from "@/constants/colors";
import { fontFamily, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { Text } from "@/components/ui/Text";

interface InputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string | null;
  /** Parol maydoni — ko'rsatish/yashirish tugmasi. */
  password?: boolean;
}

export function Input({
  label,
  icon,
  error,
  password = false,
  style,
  multiline,
  ...rest
}: InputProps) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(password);

  return (
    <View style={styles.wrap}>
      {label && (
        <Text variant="bodyStrong" style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.errored,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? Colors.primaryDark : Colors.textMuted}
          />
        )}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline, style]}
          placeholderTextColor={Colors.textSubtle}
          secureTextEntry={hidden}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {password && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={Colors.textMuted}
            />
          </Pressable>
        )}
      </View>
      {!!error && (
        <Text variant="caption" color={Colors.danger} style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  wrap: { gap: 6 },
  label: { marginLeft: 2 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  multiline: { alignItems: "flex-start", paddingVertical: spacing.md, borderRadius: radius.xl },
  focused: { borderColor: Colors.primary, backgroundColor: Colors.cardElevated },
  errored: { borderColor: Colors.danger },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: Colors.text,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.medium,
    paddingVertical: spacing.md,
    outlineStyle: "none",
  } as any,
  inputMultiline: { minHeight: 96, textAlignVertical: "top" },
  error: { marginLeft: 2 },
});
