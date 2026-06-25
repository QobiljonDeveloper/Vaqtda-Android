import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { localize } from "@/lib/localize";
import { FavoriteButton } from "@/components/FavoriteButton";
import type { ProviderRow } from "@/hooks/useProviders";

export function ProviderCard({
  provider,
  onPress,
}: {
  provider: ProviderRow;
  onPress: () => void;
}) {
  const name = localize(provider.business_name) || provider.slug;
  const category = localize(provider.category_name);
  const region = localize(provider.region_name);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image
        source={{ uri: provider.avatar_url ?? undefined }}
        style={styles.avatar}
        contentFit="cover"
        transition={150}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {!!category && (
          <Text style={styles.category} numberOfLines={1}>
            {category}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Ionicons name="star" size={13} color={Colors.star} />
          <Text style={styles.rating}>
            {(provider.rating ?? 0).toFixed(1)}
          </Text>
          <Text style={styles.reviews}>
            ({provider.reviews_count ?? 0})
          </Text>
          {!!region && (
            <>
              <Ionicons
                name="location-outline"
                size={13}
                color={Colors.textMuted}
                style={{ marginLeft: 8 }}
              />
              <Text style={styles.region} numberOfLines={1}>
                {region}
              </Text>
            </>
          )}
        </View>
      </View>
      <FavoriteButton providerId={provider.id} size={20} />
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },
  body: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: "700", color: Colors.text },
  category: { fontSize: 13, color: Colors.primaryDark, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  rating: { fontSize: 13, fontWeight: "600", color: Colors.text, marginLeft: 3 },
  reviews: { fontSize: 12, color: Colors.textMuted, marginLeft: 2 },
  region: { fontSize: 12, color: Colors.textMuted, flexShrink: 1, marginLeft: 2 },
});
