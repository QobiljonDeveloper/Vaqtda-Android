import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NotificationsBell } from "@/components/NotificationsBell";
import { ProviderCard } from "@/components/ProviderCard";
import { Chip, EmptyState, SectionHeader, SkeletonCard, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useCategories, useProviders, useTopRated } from "@/hooks/useProviders";
import { localize } from "@/lib/localize";

export default function HomeScreen() {
  const { t, lang, toggle } = useLanguage();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search);
  const categories = useCategories();
  const topRated = useTopRated();
  const { providers, loading, error, refetch } = useProviders(debouncedSearch, categoryId);

  const isDiscovery = !search.trim() && !categoryId;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* App bar */}
      <View style={styles.appbar}>
        <View style={styles.flex}>
          <Text variant="caption" muted>
            {t("home.greeting")}
          </Text>
          <Text variant="h2" color={Colors.primaryDark}>
            Vaqtda
          </Text>
        </View>
        <View style={styles.appbarRight}>
          <NotificationsBell />
          <Pressable style={styles.langBtn} onPress={toggle} hitSlop={6}>
            <Text variant="label" color={Colors.text}>
              {lang === "uz" ? "RU" : "UZ"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Qidiruv (fiksatsiyalangan — fokus yo'qolmaydi) */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={19} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("search.placeholder_main")}
            placeholderTextColor={Colors.textSubtle}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable style={styles.filterBtn} onPress={() => router.push("/search")}>
          <Ionicons name="options-outline" size={22} color={Colors.primaryForeground} />
        </Pressable>
      </View>

      <FlatList
        data={providers}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={loading && providers.length > 0}
        removeClippedSubviews
        initialNumToRender={6}
        renderItem={({ item }) => (
          <ProviderCard
            provider={item}
            onPress={() => router.push(`/provider/${item.slug}`)}
          />
        )}
        ListHeaderComponent={
          <View>
            {/* Kategoriyalar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              <Chip
                label={t("mybookings.all")}
                active={categoryId === null}
                onPress={() => setCategoryId(null)}
              />
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={localize(c.name)}
                  active={categoryId === c.id}
                  onPress={() => setCategoryId((p) => (p === c.id ? null : c.id))}
                />
              ))}
            </ScrollView>

            {/* Top-rated karusel (faqat discovery rejimida) */}
            {isDiscovery && topRated.length > 0 && (
              <View style={styles.topRated}>
                <SectionHeader title={t("home.top_rated")} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carousel}
                >
                  {topRated.map((p) => (
                    <ProviderCard
                      key={p.id}
                      provider={p}
                      variant="tile"
                      onPress={() => router.push(`/provider/${p.slug}`)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Ro'yxat sarlavhasi */}
            <View style={styles.listTitle}>
              <Text variant="title">
                {isDiscovery ? t("home.all_providers") : t("home.results", { n: providers.length })}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View>
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </View>
          ) : error ? (
            <EmptyState
              icon="cloud-offline-outline"
              title={t("providers.error_title")}
              subtitle={error}
              actionLabel={t("common.retry")}
              onAction={refetch}
            />
          ) : (
            <EmptyState
              icon="search-outline"
              title={t("search.no_results")}
              subtitle={t("providers.empty_text")}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  appbarRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  langBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text, outlineStyle: "none" } as any,
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  topRated: { marginTop: spacing.lg },
  carousel: { paddingVertical: spacing.xs, paddingRight: spacing.lg },
  listTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
});
