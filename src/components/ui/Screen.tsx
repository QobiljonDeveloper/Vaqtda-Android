import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { type ColorPalette } from "@/constants/colors";
import { spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";

interface ScreenProps {
  children: ReactNode;
  /** ScrollView ichiga o'raydi. */
  scroll?: boolean;
  /** Yon paddinglar (16). */
  padded?: boolean;
  edges?: readonly Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Klaviatura ochilganda kontentni ko'taradi (formalar uchun). */
  keyboard?: boolean;
  background?: string;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

/** Barcha ekranlar uchun yagona qobiq: safe-area, fon, scroll, refresh, klaviatura. */
export function Screen({
  children,
  scroll = false,
  padded = false,
  edges = ["top"],
  refreshing,
  onRefresh,
  keyboard = false,
  background,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const pad = padded ? { paddingHorizontal: spacing.lg } : null;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, pad, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, pad, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background ?? Colors.background }, style]} edges={edges}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: spacing.huge },
});
