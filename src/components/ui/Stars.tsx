import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";

interface StarsProps {
  value: number;
  /** Berilsa — interaktiv (yarim yulduz: chap yarmi .5, o'ng yarmi to'liq). */
  onChange?: (v: number) => void;
  size?: number;
  max?: number;
}

export function Stars({ value, onChange, size = 20, max = 5 }: StarsProps) {
  const readOnly = !onChange;

  return (
    <View style={styles.row}>
      {Array.from({ length: max }, (_, i) => {
        const full = value >= i + 1;
        const half = !full && value >= i + 0.5;
        const name = full ? "star" : half ? "star-half" : "star-outline";
        const icon = (
          <Ionicons name={name} size={size} color={Colors.star} />
        );

        if (readOnly) return <View key={i}>{icon}</View>;

        return (
          <View key={i} style={{ width: size, height: size }}>
            {icon}
            <View style={StyleSheet.absoluteFill}>
              <View style={styles.touchRow}>
                <Pressable style={styles.half} onPress={() => onChange!(i + 0.5)} />
                <Pressable style={styles.half} onPress={() => onChange!(i + 1)} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 4 },
  touchRow: { flex: 1, flexDirection: "row" },
  half: { flex: 1 },
});
