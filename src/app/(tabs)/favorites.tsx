import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProviderCard } from "@/components/ProviderCard";
import { EmptyState, SkeletonCard, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import type { ProviderRow } from "@/hooks/useProviders";

export default function FavoritesScreen() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { favoriteIds } = useFavorites();
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (favoriteIds.size === 0) {
        setProviders([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("provider_search_view")
        .select("*")
        .in("id", Array.from(favoriteIds));
      if (!active) return;
      setProviders((data as ProviderRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [favoriteIds]);

  // Olib tashlangani darhol yo'qolsin
  const visible = providers.filter((p) => favoriteIds.has(p.id));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text variant="h2" style={styles.title}>
        {t("fav.title")}
      </Text>

      {!isAuthenticated ? (
        <View style={styles.center}>
          <EmptyState
            icon="heart-outline"
            title={t("fav.title")}
            subtitle={t("fav.empty_desc")}
            actionLabel={t("auth.login")}
            onAction={() => router.push("/login")}
          />
        </View>
      ) : loading ? (
        <View style={styles.list}>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon="heart-outline"
            title={t("fav.title")}
            subtitle={t("fav.empty_desc")}
            actionLabel={t("fav.explore")}
            onAction={() => router.push("/")}
          />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProviderCard provider={item} onPress={() => router.push(`/provider/${item.slug}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  center: { flex: 1, justifyContent: "center" },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.huge },
});
