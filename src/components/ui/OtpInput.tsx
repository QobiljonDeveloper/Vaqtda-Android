import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { type ColorPalette } from "@/constants/colors";
import { fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { Text } from "@/components/ui/Text";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Katakchalar soni — tiklash kodi uchun standart 8. */
  length?: number;
  /** Tugaganda chaqiriladi (barcha kataklar to'lganda). */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Segmentli OTP kiritish maydoni.
 * Bitta yashirin TextInput barcha kataklarni boshqaradi: avtomatik o'tish,
 * backspace bilan ortga, OS SMS autofill (oneTimeCode / sms-otp).
 */
export function OtpInput({
  value,
  onChange,
  length = 8,
  onComplete,
  disabled = false,
  autoFocus = false,
}: OtpInputProps) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const digits = value.split("").slice(0, length);
  const focusBox = digits.length < length ? digits.length : length - 1;

  // Yagona yashirin input to'liq qiymatni boshqaradi: kiritish va o'chirish
  // (backspace) onChangeText orqali keladi. blur() QILMAYMIZ — aks holda kod
  // to'lgach klaviatura yopilib, oxirgi raqamni tuzatib bo'lmaydi.
  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, length);
    onChange(cleaned);
    if (cleaned.length === length) onComplete?.(cleaned);
  };

  const boxes = Array.from({ length }, (_, i) => i);

  return (
    <Pressable
      style={styles.row}
      onPress={() => inputRef.current?.focus()}
      disabled={disabled}
    >
      {boxes.map((i) => {
        const char = digits[i] ?? "";
        const isActive = focused && i === focusBox;
        return (
          <View
            key={i}
            style={[
              styles.box,
              isActive && styles.boxActive,
              char !== "" && styles.boxFilled,
              disabled && styles.boxDisabled,
            ]}
          >
            <Text variant="title" style={styles.char}>
              {char || (isActive ? "" : "•")}
            </Text>
          </View>
        );
      })}

      {/* Yashirin haqiqiy input — barcha kataklarni boshqaradi. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        editable={!disabled}
        autoFocus={autoFocus}
        caretHidden
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        style={styles.hiddenInput}
        selectionColor={Colors.primary}
      />
    </Pressable>
  );
}

const makeStyles = (Colors: ColorPalette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.xs,
    },
    box: {
      flex: 1,
      aspectRatio: 0.72,
      maxWidth: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.card,
      borderWidth: 1.5,
      borderColor: Colors.border,
      borderRadius: radius.md,
    },
    boxActive: {
      borderColor: Colors.primary,
      backgroundColor: Colors.cardElevated,
    },
    boxFilled: { borderColor: Colors.borderStrong },
    boxDisabled: { opacity: 0.5 },
    char: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: Colors.text,
    },
    hiddenInput: {
      position: "absolute",
      width: 1,
      height: 1,
      opacity: 0,
    },
  });
