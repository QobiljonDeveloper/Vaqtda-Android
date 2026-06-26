import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProviderCard } from "@/components/ProviderCard";
import { EmptyState, IconButton, SkeletonCard, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { radius, spacing } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
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
      <FlatList
        data={providers}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ProviderCard provider={item} onPress={() => router.push(`/provider/${item.slug}`)} />
        )}
        ListHeaderComponent={
          <View>
            {/* Banner */}
            <View style={styles.banner}>
              {category?.image_url ? (
                <Image source={{ uri: category.image_url }} style={styles.bannerImg} contentFit="cover" />
              ) : (
                <View style={[styles.bannerImg, styles.bannerFallback]} />
              )}
              <View style={styles.bannerOverlay} />
              <View style={styles.bannerTop}>
                <IconButton icon="chevron-back" surface onPress={() => router.back()} />
              </View>
              <View style={styles.bannerText}>
                <Text variant="label" color={Colors.white}>
                  {t("cat.badge").toUpperCase()}
                </Text>
                <Text variant="h1" color={Colors.white}>
                  {name}
                </Text>
              </View>
            </View>

            {!loading && (
              <Text variant="title" style={styles.sectionTitle}>
                {t("cat.available", { n: providers.length })}
              </Text>
            )}
          </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { paddingBottom: spacing.huge },
  pad: { paddingHorizontal: spacing.lg },
  banner: { height: 200, justifyContent: "flex-end" },
  bannerImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    backgroundColor: Colors.primarySoft,
  },
  bannerFallback: { backgroundColor: Colors.primary },
  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,18,0.35)",
  },
  bannerTop: { position: "absolute", top: spacing.sm, left: spacing.md },
  bannerText: { padding: spacing.lg, gap: 2 },
  sectionTitle: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
});
