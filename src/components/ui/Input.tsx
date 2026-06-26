import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { fontSize, fontWeight, radius, spacing } from "@/constants/theme";
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

const styles = StyleSheet.create({
  wrap: { gap: 6 },
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
  multiline: { alignItems: "flex-start", paddingVertical: spacing.md },
  focused: { borderColor: Colors.primary, backgroundColor: Colors.white },
  errored: { borderColor: Colors.danger },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: Colors.text,
    fontWeight: fontWeight.medium,
    paddingVertical: spacing.md,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: "top" },
  error: { marginLeft: 2 },
});
