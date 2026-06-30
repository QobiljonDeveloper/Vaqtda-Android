import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, EmptyState, IconButton, SkeletonCard, Text } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Colors, type ColorPalette } from "@/constants/colors";
import { fontFamily, fontSize, fontWeight, radius, shadow, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { formatDateFull } from "@/lib/format";
import { localize } from "@/lib/localize";

type Filter = "all" | "upcoming" | "completed" | "cancelled";
type IconName = keyof typeof Ionicons.glyphMap;

const UPCOMING = new Set(["upcoming", "pending", "confirmed"]);

const FILTER_KEY: Record<Filter, any> = {
  all: "status.all",
  upcoming: "status.upcoming",
  completed: "status.completed",
  cancelled: "status.cancelled",
};

function statusKind(status: string): "upcoming" | "completed" | "cancelled" {
  if (UPCOMING.has(status)) return "upcoming";
  if (status === "completed") return "completed";
  return "cancelled";
}

function statusMeta(Colors: ColorPalette, status: string): {
  tone: BadgeTone;
  key: any;
  icon: IconName;
  color: string;
} {
  const k = statusKind(status);
  if (k === "upcoming")
    return { tone: "warning", key: "status.upcoming", icon: "time-outline", color: Colors.warning };
  if (k === "completed")
    return { tone: "success", key: "status.completed", icon: "checkmark-circle-outline", color: Colors.success };
  return { tone: "danger", key: "status.cancelled", icon: "close-circle-outline", color: Colors.danger };
}

export default function HistoryScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { bookings, metrics, loading, refetch } = useBookings();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      const matchStatus =
        filter === "all" ||
        (filter === "upcoming" ? UPCOMING.has(b.status) : b.status === filter);
      if (!matchStatus) return false;
      if (!q) return true;
      const name = localize(b.provider?.business_name, lang).toLowerCase();
      const category = localize(b.provider?.category, lang).toLowerCase();
      return name.includes(q) || category.includes(q);
    });
  }, [bookings, filter, search, lang]);

  const stats = useMemo(
    () => [
      { label: t("common.total"), value: metrics.total, color: Colors.text },
      { label: t("status.upcoming"), value: metrics.upcoming, color: Colors.warning },
      { label: t("status.completed"), value: metrics.completed, color: Colors.success },
      { label: t("status.cancelled"), value: metrics.cancelled, color: Colors.danger },
    ],
    [metrics, t, Colors]
  );

  const renderHeader = () => (
    <View>
      {/* Stat tiles */}
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statTile}>
            <Text variant="h2" color={s.color}>
              {s.value}
            </Text>
            <Text variant="label" muted numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Qidiruv — provayder yoki kategoriya bo'yicha */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t("hist.search_placeholder")}
          placeholderTextColor={Colors.textSubtle}
        />
        {search.length > 0 && (
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} onPress={() => setSearch("")} />
        )}
      </View>

      {/* Status filtrlari */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {(["all", "upcoming", "completed", "cancelled"] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <Text
              key={f}
              variant="label"
              color={active ? Colors.primaryForeground : Colors.textMuted}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              {t(FILTER_KEY[f])}
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderCard = (item: Booking) => {
    const name = localize(item.provider?.business_name, lang) || t("mybookings.unknown_provider");
    const category = localize(item.provider?.category, lang);
    const meta = statusMeta(Colors, item.status);
    return (
      <View style={[styles.card, { borderLeftColor: meta.color, borderLeftWidth: 4 }]}>
        <View style={styles.cardTop}>
          <View style={[styles.statusIcon, { backgroundColor: meta.color + "22" }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                {name}
              </Text>
              <Badge label={t(meta.key)} tone={meta.tone} />
            </View>
            {!!category && (
              <Badge label={category} tone="primary" />
            )}
            <Text variant="caption" muted style={styles.date}>
              {formatDateFull(item.booking_date, lang)}
            </Text>
            <Text variant="caption" color={Colors.primaryDark}>
              {item.start_time?.slice(0, 5)}–{item.end_time?.slice(0, 5)}
              {item.duration_minutes ? ` · ${item.duration_minutes} ${t("common.min")}` : ""}
            </Text>
            {!!item.notes && (
              <Text variant="caption" muted style={styles.notes} numberOfLines={1}>
                {item.notes}
              </Text>
            )}
          </View>
        </View>

        {item.provider?.slug && (
          <Text
            variant="label"
            color={Colors.primaryDark}
            style={styles.viewLink}
            onPress={() => router.push(`/provider/${item.provider!.slug}`)}
          >
            {t("common.view")} ›
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <View style={styles.flex}>
          <Text variant="subtitle">{t("hist.title")}</Text>
          <Text variant="caption" muted numberOfLines={1}>
            {t("hist.subtitle")}
          </Text>
        </View>
      </View>

      {!isAuthenticated ? (
        <View style={styles.center}>
          <EmptyState
            icon="time-outline"
            title={t("hist.title")}
            subtitle={t("auth.login_subtitle")}
            actionLabel={t("auth.login")}
            onAction={() => router.push("/login")}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={loading && bookings.length > 0}
          renderItem={({ item }) => <View>{renderCard(item)}</View>}
          ListEmptyComponent={
            loading ? (
              <View>
                {Array.from({ length: 4 }, (_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="calendar-clear-outline"
                title={t("hist.no_bookings")}
                subtitle={filter !== "all" || search ? t("hist.no_filtered") : t("hist.no_bookings_yet")}
                actionLabel={t("hist.discover")}
                onAction={() => router.push("/")}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.huge },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  statTile: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.md,
    gap: 2,
    ...shadow.sm,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: Colors.text,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.medium,
    paddingVertical: spacing.md,
  },
  filters: { gap: spacing.sm, paddingVertical: 4, marginBottom: spacing.md },
  filterChip: {
    overflow: "hidden",
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  card: {
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadow.sm,
  },
  cardTop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  date: { marginTop: 2 },
  notes: { fontStyle: "italic", marginTop: 2 },
  viewLink: { alignSelf: "flex-end" },
});
