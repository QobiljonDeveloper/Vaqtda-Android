import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";
import { fontWeight } from "@/constants/theme";
import { Text } from "@/components/ui/Text";

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  /** Brend rangli halqa (top-rated kabi). */
  ring?: boolean;
  rounded?: boolean;
}

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function Avatar({ uri, name, size = 48, ring = false, rounded = true }: AvatarProps) {
  const br = rounded ? size / 2 : size * 0.28;
  const wrap = ring
    ? { padding: 2, borderRadius: br + 2, borderWidth: 2, borderColor: Colors.primary }
    : null;

  return (
    <View style={wrap}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: br, backgroundColor: Colors.skeleton }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: br },
          ]}
        >
          <Text
            style={{
              color: Colors.primaryDarker,
              fontWeight: fontWeight.bold,
              fontSize: size * 0.4,
            }}
          >
            {initials(name)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
  },
});
