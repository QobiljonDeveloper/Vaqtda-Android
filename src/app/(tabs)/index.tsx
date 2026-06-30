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
import { Colors, type ColorPalette } from "@/constants/colors";
import { fontFamily, radius, shadow, spacing } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useCategories, useProviders, useTopRated, type CategoryRow } from "@/hooks/useProviders";
import { useSmartSearch } from "@/hooks/useSmartSearch";
import { localize } from "@/lib/localize";

// Kategoriya slug/nomidan mos Ionicon + rang qutisini tanlaydi (Stitch bento grid).
function categoryVisual(c: CategoryRow): { icon: keyof typeof Ionicons.glyphMap; tone: number } {
  const key = `${c.slug ?? ""} ${localize(c.name) ?? ""}`.toLowerCase();
  if (/sartarosh|barber|soch/.test(key)) return { icon: "cut", tone: 0 };
  if (/stomatolog|tish|dental/.test(key)) return { icon: "medical", tone: 2 };
  if (/advokat|yurist|lawyer|huquq/.test(key)) return { icon: "briefcase", tone: 1 };
  if (/klinik|shifo|clinic|hospital|tibbi/.test(key)) return { icon: "medkit", tone: 1 };
  if (/salon|go.zal|beauty|makiyaj/.test(key)) return { icon: "color-wand", tone: 3 };
  if (/spa|massaj|wellness/.test(key)) return { icon: "water", tone: 4 };
  if (/restoran|kafe|ovqat|food/.test(key)) return { icon: "restaurant", tone: 3 };
  if (/o.yin|game|esports|klub/.test(key)) return { icon: "game-controller", tone: 1 };
  if (/sport|fitnes|gym/.test(key)) return { icon: "barbell", tone: 0 };
  return { icon: "sparkles", tone: 4 };
}

export default function HomeScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, lang, toggle } = useLanguage();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [correctedTerm, setCorrectedTerm] = useState<string | null>(null);
  const [aiCorrection, setAiCorrection] = useState<{ corrected: string; raw: string } | null>(null);

  const debouncedSearch = useDebounce(search);
  const { correct, correcting } = useSmartSearch();
  const categories = useCategories();
  const topRated = useTopRated();
  // AI to'g'irlangan termin (submit bo'lganda), aks holda jonli xom so'rov.
  const activeTerm = correctedTerm ?? debouncedSearch;
  const { providers, loading, error, refetch } = useProviders(activeTerm, categoryId);

  const isDiscovery = !search.trim() && !categoryId;

  // Yozayotganda eski AI to'g'irlashni tozalaymiz — jonli (xom) qidiruv tiklanadi.
  const onChangeSearch = (text: string) => {
    setSearch(text);
    setCorrectedTerm(null);
    setAiCorrection(null);
  };
  // "Search" tugmasi: AI imlo to'g'irlash (advkat -> advokat) -> qidiruv. FAIL OPEN.
  const onSubmitSearch = async () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    const { corrected, raw } = await correct(trimmed);
    setCorrectedTerm(corrected);
    setAiCorrection(corrected.toLowerCase() !== raw.toLowerCase() ? { corrected, raw } : null);
  };

  // Stitch "Qanday ishlaydi?" 3 bosqich — mavjud howitworks kalitlaridan.
  const steps: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }[] = [
    { icon: "search", title: t("howitworks.client_find_title"), desc: t("howitworks.client_find_desc") },
    { icon: "calendar-outline", title: t("howitworks.client_book_title"), desc: t("howitworks.client_book_desc") },
    { icon: "checkmark-circle", title: t("howitworks.client_enjoy_title"), desc: t("howitworks.client_enjoy_desc") },
  ];

  // Kategoriya katakchasini fon ranglar palitrasiga moslaydi (Stitch container ranglari).
  const toneBg = [Colors.primarySoft, Colors.infoSoft, Colors.dangerSoft, Colors.primaryTint, Colors.successSoft];
  const toneFg = [Colors.primaryDark, Colors.info, Colors.danger, Colors.primaryDark, Colors.success];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* App bar — salomlashish + bildirishnoma + til */}
      <View style={styles.appbar}>
        <View style={styles.appbarLeft}>
          <View style={styles.avatarStub}>
            <Ionicons name="person-circle" size={44} color={Colors.primaryDark} />
          </View>
          <View style={styles.flex}>
            <Text variant="caption" muted>
              {t("home.greeting")}
            </Text>
            <Text variant="title" color={Colors.text} numberOfLines={1}>
              Vaqtda
            </Text>
          </View>
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
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("search.placeholder_main")}
            placeholderTextColor={Colors.textSubtle}
            value={search}
            onChangeText={onChangeSearch}
            onSubmitEditing={onSubmitSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => onChangeSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          )}
          <Pressable style={styles.filterBtn} onPress={() => router.push("/search")} hitSlop={6}>
            <Ionicons name="options-outline" size={20} color={Colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      {/* AI imlo to'g'irlash banneri — "advkat" -> "advokat" topilganda ko'rinadi */}
      {(correcting || aiCorrection) && (
        <View style={styles.aiBanner}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={15} color={Colors.primaryForeground} />
          </View>
          {correcting ? (
            <Text variant="caption" muted style={styles.flex}>
              {t("search.ai_searching")}
            </Text>
          ) : aiCorrection ? (
            <Text variant="caption" color={Colors.primaryDarker} style={styles.flex}>
              {t("search.ai_corrected", {
                corrected: aiCorrection.corrected,
                raw: aiCorrection.raw,
              })}
            </Text>
          ) : null}
        </View>
      )}

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
            {/* Kategoriyalar — Stitch bento grid */}
            {categories.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text variant="title">{t("categories.title")}</Text>
                  <Pressable onPress={() => setCategoryId(null)} hitSlop={6}>
                    <Text variant="bodyStrong" color={Colors.primaryDark}>
                      {t("categories.view_all")}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.grid}>
                  {/* "Hammasi" — barcha filtrlarni tozalaydi */}
                  <Pressable
                    style={[styles.gridCell, categoryId === null && styles.gridCellActive]}
                    onPress={() => setCategoryId(null)}
                  >
                    <View style={[styles.gridIcon, { backgroundColor: Colors.primarySoft }]}>
                      <Ionicons name="grid" size={20} color={Colors.primaryDark} />
                    </View>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {t("categories.view_all")}
                    </Text>
                  </Pressable>
                  {categories.map((c) => {
                    const v = categoryVisual(c);
                    const active = categoryId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        style={[styles.gridCell, active && styles.gridCellActive]}
                        onPress={() => setCategoryId((p) => (p === c.id ? null : c.id))}
                      >
                        <View style={[styles.gridIcon, { backgroundColor: toneBg[v.tone] }]}>
                          <Ionicons name={v.icon} size={20} color={toneFg[v.tone]} />
                        </View>
                        <Text variant="bodyStrong" numberOfLines={2}>
                          {localize(c.name)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Top reytingli karusel (faqat discovery rejimida) */}
            {isDiscovery && topRated.length > 0 && (
              <View style={styles.section}>
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
        ListFooterComponent={
          isDiscovery && !loading && !error && providers.length > 0 ? (
            <View style={styles.howCard}>
              <Text variant="subtitle" style={styles.howTitle}>
                {t("howitworks.title")}
              </Text>
              <View style={styles.howSteps}>
                {steps.map((s, i) => (
                  <View key={s.title} style={styles.howStep}>
                    <View style={styles.howStepIcon}>
                      <Ionicons name={s.icon} size={20} color={Colors.primaryForeground} />
                    </View>
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">
                        {i + 1}. {s.title}
                      </Text>
                      <Text variant="caption" muted style={styles.howStepDesc}>
                        {s.desc}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null
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

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  // App bar
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  appbarLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  avatarStub: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  appbarRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  langBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  // Search — pill bilan ichki filtr tugmasi (Stitch)
  searchRow: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.pill,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    height: 56,
    ...shadow.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontFamily: fontFamily.medium,
    outlineStyle: "none",
  } as any,
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // AI to'g'irlash banneri
  aiBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: Colors.primarySoft,
    borderRadius: radius.lg,
  },
  aiBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },

  // Sections
  section: { marginTop: spacing.xl },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },

  // Kategoriyalar bento grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  gridCell: {
    width: "47.8%",
    minHeight: 120,
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.lg,
    justifyContent: "space-between",
    gap: spacing.md,
    ...shadow.sm,
  },
  gridCellActive: { borderColor: Colors.primary, borderWidth: 2 },
  gridIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },

  // Filtr chiplari
  chips: { gap: spacing.sm, paddingTop: spacing.lg, paddingRight: spacing.lg },

  // Top-rated karusel
  carousel: { paddingVertical: spacing.xs, paddingRight: spacing.lg },

  listTitle: { marginTop: spacing.xl, marginBottom: spacing.md },

  // "Qanday ishlaydi?" karta
  howCard: {
    marginTop: spacing.lg,
    backgroundColor: Colors.primarySoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: Colors.primaryTint,
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  howTitle: { marginBottom: spacing.xs },
  howSteps: { gap: spacing.lg },
  howStep: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  howStepIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  howStepDesc: { marginTop: 2 },
});
