import { StyleSheet, View, type ViewStyle } from "react-native";

import { Colors, type ColorPalette } from "@/constants/colors";
import { useThemedStyles } from "@/context/ThemeContext";

export function Divider({ style }: { style?: ViewStyle }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.line, style]} />;
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
});
