import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FavoriteButton } from "@/components/FavoriteButton";
import { EmptyState, SkeletonCard, Text } from "@/components/ui";
import { Colors, type ColorPalette } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { localize } from "@/lib/localize";
import { supabase } from "@/lib/supabase";
import type { ProviderRow } from "@/hooks/useProviders";

interface Category {
  id: string;
  name: any;
  slug: string;
  image_url: string | null;
}

export default function CategoryScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useLanguage();
  const router = useRouter();

  const [category, setCategory] = useState<Category | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: cat } = await supabase
        .from("categories")
        .select("id, name, slug, image_url")
        .eq("slug", slug)
        .maybeSingle();
      setCategory(cat as Category | null);

      if (cat) {
        const { data } = await supabase
          .from("provider_search_view")
          .select("*")
          .eq("category_id", (cat as Category).id)
          .eq("is_active", true)
          .order("rating", { ascending: false });
        setProviders((data as ProviderRow[]) ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  const name = category ? localize(category.name) : t("cat.fallback");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* TopAppBar */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </Pressable>
        <Text variant="title" color={Colors.primary} numberOfLines={1} style={styles.headerTitle}>
          {name}
        </Text>
        <View style={styles.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={Colors.textMuted} />
        </View>
      </View>

      <FlatList
        data={providers}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <CategoryProviderCard
            provider={item}
            onPress={() => router.push(`/provider/${item.slug}`)}
          />
        )}
        ListHeaderComponent={
          !loading ? (
            <View style={styles.countRow}>
              <Text variant="body" muted>
                {t("home.results", { n: providers.length })}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.pad}>
              {Array.from({ length: 4 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </View>
          ) : (
            <View style={styles.pad}>
              <EmptyState
                icon="people-outline"
                title={t("cat.no_providers")}
                subtitle={t("cat.no_providers_desc", { name })}
              />
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function CategoryProviderCard({
  provider,
  onPress,
}: {
  provider: ProviderRow;
  onPress: () => void;
}) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useLanguage();
  const name = localize(provider.business_name) || provider.slug;
  const category = localize(provider.category_name);
  const region = localize(provider.region_name);
  const rating = provider.rating ?? 0;
  const reviews = provider.reviews_count ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* Image with floating rating badge */}
      <View style={styles.cardImageWrap}>
        <Image
          source={{ uri: provider.avatar_url ?? undefined }}
          style={styles.cardImage}
          contentFit="cover"
          transition={150}
        />
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={14} color={Colors.star} />
          <Text style={styles.ratingBadgeText}>{rating.toFixed(1)}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text variant="title" numberOfLines={1} style={styles.cardTitle}>
            {name}
          </Text>
          <FavoriteButton providerId={provider.id} size={22} />
        </View>

        {!!region && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
            <Text variant="body" muted numberOfLines={1} style={styles.flex}>
              {region}
            </Text>
          </View>
        )}

        {!!category && (
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{category}</Text>
            </View>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.flex}>
            <Text style={styles.footerLabel} numberOfLines={1}>
              {t("profile.reviews_count", { n: reviews })}
            </Text>
            <Text variant="bodyStrong" color={Colors.primary} numberOfLines={1} style={styles.footerValueRow}>
              {category || name}
            </Text>
          </View>
          <View style={styles.footerArrow}>
            <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const makeStyles = (Colors: ColorPalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    flex: { flexShrink: 1 },

    header: {
      flexDirection: "row",
      alignItems: "center",
      height: 56,
      paddingHorizontal: spacing.sm,
    },
    headerBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { flex: 1, textAlign: "center" },

    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },
    pad: { paddingTop: spacing.sm },
    countRow: { paddingTop: spacing.xs, paddingBottom: spacing.md },

    // Card
    card: {
      backgroundColor: Colors.cardElevated,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: "hidden",
      marginBottom: spacing.lg,
      ...shadow.md,
    },
    pressed: { opacity: 0.97, transform: [{ scale: 0.985 }] },
    cardImageWrap: { width: "100%", aspectRatio: 4 / 3, backgroundColor: Colors.skeleton },
    cardImage: { width: "100%", height: "100%" },
    ratingBadge: {
      position: "absolute",
      top: spacing.md,
      right: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: Colors.cardElevated,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      ...shadow.sm,
    },
    ratingBadgeText: { fontSize: 13, fontWeight: "700", color: Colors.text },

    cardBody: { padding: spacing.md, gap: spacing.xs },
    cardTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.xs,
    },
    cardTitle: { flex: 1 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },

    tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: 2 },
    tag: {
      backgroundColor: Colors.card,
      borderRadius: radius.md,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    tagText: { fontSize: 12, fontWeight: "500", color: Colors.textMuted },

    cardFooter: {
      marginTop: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    footerLabel: { fontSize: 12, fontWeight: "500", color: Colors.textMuted },
    footerValueRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    footerArrow: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: Colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
  });
