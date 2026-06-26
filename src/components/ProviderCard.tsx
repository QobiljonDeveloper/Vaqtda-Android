import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { FavoriteButton } from "@/components/FavoriteButton";
import { Text } from "@/components/ui/Text";
import { Colors } from "@/constants/colors";
import { fontWeight, radius, shadow, spacing } from "@/constants/theme";
import { localize } from "@/lib/localize";
import type { ProviderRow } from "@/hooks/useProviders";

interface ProviderCardProps {
  provider: ProviderRow;
  onPress: () => void;
  variant?: "row" | "tile";
  distanceLabel?: string;
}

function ProviderCardBase({ provider, onPress, variant = "row", distanceLabel }: ProviderCardProps) {
  const name = localize(provider.business_name) || provider.slug;
  const category = localize(provider.category_name);
  const region = localize(provider.region_name);
  const rating = provider.rating ?? 0;
  const reviews = provider.reviews_count ?? 0;

  if (variant === "tile") {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      >
        <View>
          <Image
            source={{ uri: provider.avatar_url ?? undefined }}
            style={styles.tileImage}
            contentFit="cover"
            transition={150}
          />
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={11} color={Colors.star} />
            <Text style={styles.ratingBadgeText}>{rating.toFixed(1)}</Text>
          </View>
          <View style={styles.tileFav}>
            <FavoriteButton providerId={provider.id} size={18} />
          </View>
        </View>
        <View style={styles.tileBody}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          {!!category && (
            <Text variant="caption" color={Colors.primaryDark} numberOfLines={1}>
              {category}
            </Text>
          )}
          {!!region && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
              <Text variant="caption" muted numberOfLines={1} style={styles.flex}>
                {distanceLabel || region}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image
        source={{ uri: provider.avatar_url ?? undefined }}
        style={styles.avatar}
        contentFit="cover"
        transition={150}
      />
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        {!!category && (
          <Text variant="caption" color={Colors.primaryDark} numberOfLines={1}>
            {category}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Ionicons name="star" size={13} color={Colors.star} />
          <Text variant="caption" style={styles.ratingText}>
            {rating.toFixed(1)}
          </Text>
          <Text variant="caption" muted>
            ({reviews})
          </Text>
          {!!(distanceLabel || region) && (
            <>
              <View style={styles.dot} />
              <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
              <Text variant="caption" muted numberOfLines={1} style={styles.flex}>
                {distanceLabel || region}
              </Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.rowRight}>
        <FavoriteButton providerId={provider.id} size={20} />
      </View>
    </Pressable>
  );
}

export const ProviderCard = memo(ProviderCardBase);

const styles = StyleSheet.create({
  pressed: { opacity: 0.95, transform: [{ scale: 0.99 }] },
  flex: { flexShrink: 1 },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: spacing.md,
    ...shadow.sm,
  },
  avatar: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: Colors.skeleton },
  body: { flex: 1, gap: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  ratingText: { fontWeight: fontWeight.bold, color: Colors.text },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.borderStrong, marginHorizontal: 4 },
  rowRight: { alignSelf: "flex-start" },

  // Tile
  tile: {
    width: 184,
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: spacing.md,
    overflow: "hidden",
    ...shadow.sm,
  },
  tileImage: { width: "100%", height: 120, backgroundColor: Colors.skeleton },
  tileBody: { padding: spacing.md, gap: 2 },
  ratingBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingBadgeText: { fontSize: 11, fontWeight: fontWeight.bold, color: Colors.text },
  tileFav: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: radius.pill,
  },
});
