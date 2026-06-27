import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProviderCard } from "@/components/ProviderCard";
import { Chip, EmptyState, IconButton, SkeletonCard, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { radius, spacing } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useCategories, useProviders, type ProviderRow } from "@/hooks/useProviders";
import { useRegions } from "@/hooks/useRegions";
import { formatDistance } from "@/lib/format";
import { localize } from "@/lib/localize";
import { supabase } from "@/lib/supabase";

type Mode = "all" | "near" | string; // string = regionId

export default function SearchScreen() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("all");

  const categories = useCategories();
  const regions = useRegions();

  const regionId = mode !== "all" && mode !== "near" ? mode : null;
  const debouncedQuery = useDebounce(query);
  const { providers, loading, refetch } = useProviders(debouncedQuery, categoryId, regionId);

  // Geolokatsiya rejimi
  const [geoItems, setGeoItems] = useState<ProviderRow[]>([]);
  const [geoDist, setGeoDist] = useState<Record<string, number>>({});
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const runGeo = useCallback(async () => {
    setGeoLoading(true);
    setGeoError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGeoError(t("search.location_denied"));
        setGeoItems([]);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { data } = await supabase.rpc("get_closest_providers", {
        user_lat: pos.coords.latitude,
        user_lng: pos.coords.longitude,
        search_term: query.trim(),
      });
      const dist: Record<string, number> = {};
      const items = ((data as any[]) ?? []).map((p) => {
        dist[p.id] = p.distance_meters;
        return {
          id: p.id,
          user_id: "",
          business_name: p.business_name,
          slug: p.slug,
          location: null,
          about: p.about ?? null,
          avatar_url: p.avatar_url ?? null,
          rating: p.rating ?? 0,
          reviews_count: p.reviews_count ?? 0,
          is_active: true,
          phone_number: null,
          category_id: null,
          region_id: null,
          category_name: p.category_name ?? null,
          region_name: p.exact_address ?? null,
        } as ProviderRow;
      });
      setGeoDist(dist);
      setGeoItems(items);
    } catch {
      setGeoError(t("common.error"));
    } finally {
      setGeoLoading(false);
    }
  }, [query, t]);

  useEffect(() => {
    if (mode === "near") runGeo();
  }, [mode, runGeo]);

  const isNear = mode === "near";
  const results = isNear ? geoItems : providers;
  const busy = isNear ? geoLoading : loading;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text variant="subtitle" style={styles.flex}>
          {t("search.title")}
        </Text>
      </View>

      {/* Qidiruv */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={19} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("search.placeholder")}
          placeholderTextColor={Colors.textSubtle}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ProviderCard
            provider={item}
            onPress={() => router.push(`/provider/${item.slug}`)}
            distanceLabel={
              isNear && geoDist[item.id] != null
                ? formatDistance(geoDist[item.id], lang)
                : undefined
            }
          />
        )}
        ListHeaderComponent={
          <View style={styles.filters}>
            {/* Hudud */}
            <Text variant="label" muted style={styles.filterLabel}>
              {t("search.region").toUpperCase()}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              <Chip
                label={t("search.near_me")}
                icon="navigate"
                active={mode === "near"}
                onPress={() => setMode("near")}
              />
              <Chip
                label={t("search.all_regions")}
                active={mode === "all"}
                onPress={() => setMode("all")}
              />
              {regions.map((r) => (
                <Chip
                  key={r.id}
                  label={localize(r.name)}
                  active={mode === r.id}
                  onPress={() => setMode(r.id)}
                />
              ))}
            </ScrollView>

            {/* Kategoriya (geo rejimida o'chiq) */}
            {!isNear && (
              <>
                <Text variant="label" muted style={styles.filterLabel}>
                  {t("search.filter_category").toUpperCase()}
                </Text>
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
              </>
            )}

            {!busy && (
              <Text variant="caption" muted style={styles.count}>
                {t("home.results", { n: results.length })}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          busy ? (
            <View>
              {isNear && (
                <Text variant="caption" muted center style={styles.locating}>
                  {t("search.locating")}
                </Text>
              )}
              {Array.from({ length: 4 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </View>
          ) : geoError ? (
            <EmptyState
              icon="location-outline"
              title={geoError}
              actionLabel={t("common.retry")}
              onAction={runGeo}
            />
          ) : (
            <EmptyState
              icon="search-outline"
              title={t("search.no_results")}
              subtitle={t("search.no_results_desc", {
                query: query || "—",
                category: t("mybookings.all"),
              })}
              actionLabel={t("search.reset")}
              onAction={() => {
                setQuery("");
                setCategoryId(null);
                setMode("all");
                refetch();
              }}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    height: 50,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.huge },
  filters: { gap: spacing.xs },
  filterLabel: { marginTop: spacing.sm, marginBottom: spacing.xs },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  count: { marginTop: spacing.md },
  locating: { marginBottom: spacing.md },
});
