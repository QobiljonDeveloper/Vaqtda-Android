import { StyleSheet, View, type ViewStyle } from "react-native";

import { Colors } from "@/constants/colors";

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.line, style]} />;
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
});
