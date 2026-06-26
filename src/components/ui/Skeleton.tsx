import { useEffect, useRef } from "react";
import { Animated, type DimensionValue, StyleSheet, type ViewStyle } from "react-native";

import { Colors } from "@/constants/colors";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 14, radius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: Colors.skeleton, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <Animated.View style={styles.card}>
      <Skeleton width={60} height={60} radius={12} />
      <Animated.View style={styles.cardBody}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} />
        <Skeleton width="55%" height={12} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  cardBody: { flex: 1, gap: 8, justifyContent: "center" },
});
