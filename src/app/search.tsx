import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FavoriteButton } from "@/components/FavoriteButton";
import { Chip, EmptyState, IconButton, SkeletonCard, Text } from "@/components/ui";
import { Colors, type ColorPalette } from "@/constants/colors";
import { fontFamily, fontWeight, radius, shadow, spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useCategories, useProviders, type ProviderRow } from "@/hooks/useProviders";
import { useRegions } from "@/hooks/useRegions";
import { useSmartSearch } from "@/hooks/useSmartSearch";
import { formatDistance } from "@/lib/format";
import { localize } from "@/lib/localize";
import { supabase } from "@/lib/supabase";

type Mode = "all" | "near" | string; // string = regionId

export default function SearchScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState(""); // Xom kiritma (TextInput'da ko'rinadi)
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("all");

  // AI imlo to'g'irlash. correctedTerm — qidiruvga ketadigan termin.
  // aiCorrection — faqat banner uchun (corrected !== raw bo'lganda ko'rinadi).
  const { correct, correcting } = useSmartSearch();
  const [correctedTerm, setCorrectedTerm] = useState<string | null>(null);
  const [aiCorrection, setAiCorrection] = useState<{ corrected: string; raw: string } | null>(
    null,
  );

  const categories = useCategories();
  const regions = useRegions();

  const regionId = mode !== "all" && mode !== "near" ? mode : null;
  const debouncedQuery = useDebounce(query);
  // Yozayotganda jonli qidiruv (xom), submit'dan keyin AI to'g'irlangan termin.
  const activeTerm = correctedTerm ?? debouncedQuery;
  const { providers, loading, refetch } = useProviders(activeTerm, categoryId, regionId);

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
        // AI to'g'irlangan termin (mavjud bo'lsa), aks holda xom so'rov.
        search_term: (correctedTerm ?? query).trim(),
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
  }, [query, correctedTerm, t]);

  useEffect(() => {
    if (mode === "near") runGeo();
  }, [mode, runGeo]);

  // Yozish boshlanganda eski AI to'g'irlashni tozalaymiz —
  // jonli (xom) qidiruv tiklanadi va banner yo'qoladi.
  const onChangeQuery = useCallback((text: string) => {
    setQuery(text);
    setCorrectedTerm(null);
    setAiCorrection(null);
  }, []);

  // Klaviaturadagi "search" tugmasi: AI to'g'irlash → qidiruv.
  // FAIL OPEN: smartCorrect throw qilmaydi, AI yo'q bo'lsa raw bilan ishlaydi.
  const onSubmit = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const { corrected, raw } = await correct(trimmed);
    setCorrectedTerm(corrected);
    setAiCorrection(corrected.toLowerCase() !== raw.toLowerCase() ? { corrected, raw } : null);
  }, [query, correct]);

  const isNear = mode === "near";
  const results = isNear ? geoItems : providers;
  const busy = isNear ? geoLoading : loading;

  const clearQuery = () => {
    setQuery("");
    setCorrectedTerm(null);
    setAiCorrection(null);
  };

  // Stitch dizayniga mos natija kartasi — rasm, nom, reyting pill, joylashuv,
  // to'liq kenglikdagi "Band qilish" tugmasi. Logika o'zgarmaydi: bosilganda
  // provayder sahifasiga o'tadi.
  const renderCard = ({ item }: { item: ProviderRow }) => {
    const name = localize(item.business_name) || item.slug;
    const category = localize(item.category_name);
    const region = localize(item.region_name);
    const about = localize(item.about);
    const rating = item.rating ?? 0;
    const reviews = item.reviews_count ?? 0;
    const distance =
      isNear && geoDist[item.id] != null ? formatDistance(geoDist[item.id], lang) : undefined;
    const meta = distance && region ? `${distance} • ${region}` : distance || region;
    const goToProvider = () => router.push(`/provider/${item.slug}`);

    return (
      <Pressable
        onPress={goToProvider}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {/* Cover rasm — ustida yurak (yuqori-o'ng) + reyting badge (past-chap) */}
        <View style={styles.cardImageWrap}>
          <Image
            source={{ uri: item.avatar_url ?? undefined }}
            style={styles.cardImage}
            contentFit="cover"
            transition={150}
          />
          <View style={styles.cardFav}>
            <FavoriteButton providerId={item.id} size={16} />
          </View>
          <View style={styles.cardRating}>
            <Ionicons name="star" size={13} color={Colors.star} />
            <Text style={styles.cardRatingText}>
              {rating.toFixed(1)}
              {reviews > 0 ? ` (${reviews})` : ""}
            </Text>
          </View>
        </View>

        {/* Tana — nom, tavsif, teglar, footer (joylashuv + Band qilish) */}
        <View style={styles.cardBody}>
          <Text variant="subtitle" numberOfLines={1}>
            {name}
          </Text>
          {!!about && (
            <Text variant="caption" muted numberOfLines={2} style={styles.cardDesc}>
              {about}
            </Text>
          )}
          <View style={styles.tagRow}>
            {!!category && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{category}</Text>
              </View>
            )}
            {!!region && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{region}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardFooter}>
            <Text variant="caption" muted numberOfLines={1} style={styles.flexShrink}>
              {meta || category}
            </Text>
            <Pressable
              onPress={goToProvider}
              style={({ pressed }) => [styles.bookBtn, pressed && styles.bookBtnPressed]}
            >
              <Text style={styles.bookBtnText}>{t("common.book")}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header — orqaga, markazda sarlavha, o'ng menyu (Stitch top app bar) */}
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text variant="title" center style={styles.headerTitle}>
          {t("auth.brand_name")}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Qidiruv — pill shaklidagi maydon, mic ikonkasi */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("search.placeholder")}
          placeholderTextColor={Colors.textSubtle}
          value={query}
          onChangeText={onChangeQuery}
          onSubmitEditing={onSubmit}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable onPress={clearQuery} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </Pressable>
        ) : (
          <Ionicons name="mic-outline" size={20} color={Colors.primary} />
        )}
      </View>

      {/* AI imlo to'g'irlash banneri — Stitch "AI Tavsiyasi" kartasi */}
      {correcting ? (
        <View style={styles.aiBanner}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={18} color={Colors.primaryForeground} />
          </View>
          <Text variant="bodyStrong" muted style={styles.flex}>
            {t("search.ai_searching")}
          </Text>
        </View>
      ) : aiCorrection ? (
        <View style={styles.aiBanner}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={18} color={Colors.primaryForeground} />
          </View>
          <Text variant="caption" color={Colors.primaryDarker} style={styles.flex}>
            {t("search.ai_corrected", {
              corrected: aiCorrection.corrected,
              raw: aiCorrection.raw,
            })}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={renderCard}
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

            {/* Natijalar sarlavhasi — "N ta natija" (Stitch headline-md) */}
            {!busy && (
              <Text variant="h2" style={styles.count}>
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
                setCorrectedTerm(null);
                setAiCorrection(null);
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

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { flex: 1, color: Colors.primary },
  headerSpacer: { width: 40 },

  // Qidiruv (pill)
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.xl,
    height: 52,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    fontFamily: fontFamily.medium,
    outlineStyle: "none",
  } as any,

  // AI banner — primarySoft konteyner, yumaloq badge ikonka
  aiBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: Colors.primarySoft,
    ...shadow.sm,
  },
  aiBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },

  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  filters: { gap: spacing.xs },
  filterLabel: { marginTop: spacing.sm, marginBottom: spacing.xs },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.xl },
  count: { marginTop: spacing.lg, marginBottom: spacing.xs },
  locating: { marginBottom: spacing.md },

  // Natija kartasi — Stitch dark: cover rasm yuqorida, 24px radius
  card: {
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadow.sm,
  },
  cardPressed: { opacity: 0.97, transform: [{ scale: 0.995 }] },
  cardImageWrap: {
    width: "100%",
    height: 170,
    backgroundColor: Colors.skeleton,
  },
  cardImage: { width: "100%", height: "100%" },
  cardFav: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: Colors.overlay,
    borderRadius: radius.pill,
    padding: 3,
  },
  cardRating: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.overlay,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardRatingText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.bold,
    color: Colors.white,
  },
  cardBody: { padding: spacing.lg, gap: 6 },
  cardDesc: { lineHeight: 18 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  tag: {
    backgroundColor: Colors.backgroundAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.semibold,
    color: Colors.textMuted,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: 4,
  },

  // "Band qilish" tugmasi (pill, o'ngda — to'liq kenglik emas)
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBtnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  bookBtnText: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.semibold,
    color: Colors.primaryForeground,
  },
});
