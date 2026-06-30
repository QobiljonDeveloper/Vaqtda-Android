import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar, Badge, Button, EmptyState, SkeletonCard, Text } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Colors, type ColorPalette } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { formatDateFull } from "@/lib/format";
import { localize } from "@/lib/localize";

type Filter = "all" | "upcoming" | "completed" | "cancelled";
type IconName = keyof typeof Ionicons.glyphMap;

const UPCOMING = new Set(["upcoming", "pending", "confirmed"]);

type StatusKind = "upcoming" | "completed" | "cancelled";

function statusKind(status: string): StatusKind {
  if (UPCOMING.has(status)) return "upcoming";
  if (status === "completed") return "completed";
  return "cancelled";
}

function statusMeta(status: string): { tone: BadgeTone; key: any } {
  const k = statusKind(status);
  if (k === "upcoming") return { tone: "warning", key: "status.upcoming" };
  if (k === "completed") return { tone: "success", key: "status.completed" };
  return { tone: "danger", key: "status.cancelled" };
}

/** Karta chetidagi status rangi (web bilan bir xil: warning/success/danger). */
function statusColor(Colors: ColorPalette, status: string): string {
  const k = statusKind(status);
  if (k === "upcoming") return Colors.warning;
  if (k === "completed") return Colors.success;
  return Colors.danger;
}

/** Boshlanishigacha millisekund (Toshkent UTC+5). */
function msUntilStart(date: string, start: string): number {
  if (!date) return -1;
  const time = (start || "00:00").slice(0, 5);
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const startUtc = Date.UTC(y, mo - 1, d, h, mi) - 5 * 3600000;
  return startUtc - Date.now();
}

/** Web bilan bir xil: boshlanishiga kamida 1 kun (24 soat) bo'lsa bekor qilsa bo'ladi. */
function canCancel(date: string, start: string): boolean {
  return msUntilStart(date, start) >= 24 * 3600000;
}

/** "in 2d 5h" ko'rinishidagi countdown — mobilga moslangan. */
function countdown(date: string, start: string, lang: "uz" | "ru"): string {
  const diff = msUntilStart(date, start);
  if (diff <= 0) return lang === "ru" ? "Сейчас" : "Hozir";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return lang === "ru" ? `через ${days}д ${hours}ч` : `${days}k ${hours}s qoldi`;
  if (hours > 0) return lang === "ru" ? `через ${hours}ч ${minutes}м` : `${hours}s ${minutes}d qoldi`;
  return lang === "ru" ? `через ${minutes}м` : `${minutes}d qoldi`;
}

const METRICS: { key: Filter; labelKey: any; icon: IconName; tone: BadgeTone }[] = [
  { key: "all", labelKey: "mybookings.all", icon: "grid-outline", tone: "primary" },
  { key: "upcoming", labelKey: "status.upcoming", icon: "time-outline", tone: "warning" },
  { key: "completed", labelKey: "status.completed", icon: "checkmark-circle-outline", tone: "success" },
  { key: "cancelled", labelKey: "status.cancelled", icon: "close-circle-outline", tone: "danger" },
];

export default function BookingsScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { bookings, metrics, loading, cancel, refetch } = useBookings();
  // Web: default Upcoming.
  const [filter, setFilter] = useState<Filter>("upcoming");
  // Countdownni jonli yangilab turish uchun har daqiqada tick.
  const [, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return bookings;
    if (filter === "upcoming") return bookings.filter((b) => UPCOMING.has(b.status));
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  // Bo'lajak bronlarni sanaga ko'ra guruhlash (web BookingList kabi).
  const sections = useMemo(() => {
    if (filter !== "upcoming") {
      return [{ date: null as string | null, items: filtered }];
    }
    // Bo'lajaklarni yaqin sanadan boshlab (o'sish tartibida) ko'rsatamiz.
    const sorted = [...filtered].sort((a, b) => {
      if (a.booking_date !== b.booking_date) return a.booking_date < b.booking_date ? -1 : 1;
      return a.start_time < b.start_time ? -1 : 1;
    });
    const map = new Map<string, Booking[]>();
    for (const b of sorted) {
      const arr = map.get(b.booking_date) ?? [];
      arr.push(b);
      map.set(b.booking_date, arr);
    }
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [filtered, filter]);

  // Eng yaqin bo'lajak bron — header'da jonli countdown.
  const nextBooking = useMemo(() => {
    return bookings
      .filter((b) => UPCOMING.has(b.status) && msUntilStart(b.booking_date, b.start_time) > 0)
      .sort((a, b) => msUntilStart(a.booking_date, a.start_time) - msUntilStart(b.booking_date, b.start_time))[0];
  }, [bookings]);

  const onCancel = (b: Booking) => {
    if (!canCancel(b.booking_date, b.start_time)) {
      Alert.alert(t("booking.cancel"), t("booking.cancel_too_late"));
      return;
    }
    Alert.alert(t("booking.cancel"), t("booking.cancel_confirm"), [
      { text: t("booking.stay"), style: "cancel" },
      {
        text: t("booking.cancel"),
        style: "destructive",
        onPress: async () => {
          const { error } = await cancel(b.id);
          if (!error) Alert.alert(t("booking.cancelled_ok"));
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <EmptyState
          icon="calendar-outline"
          title={t("booking.my_bookings")}
          subtitle={t("auth.login_subtitle")}
          actionLabel={t("auth.login")}
          onAction={() => router.push("/login")}
        />
      </SafeAreaView>
    );
  }

  const metricValue = (k: Filter) =>
    k === "all" ? metrics.total : k === "upcoming" ? metrics.upcoming : k === "completed" ? metrics.completed : metrics.cancelled;

  const renderHeader = () => (
    <View>
      <View style={styles.titleRow}>
        <Text variant="h2" style={styles.flex}>
          {t("booking.my_bookings")}
        </Text>
        <Pressable style={styles.historyLink} hitSlop={8} onPress={() => router.push("/history")}>
          <Ionicons name="time-outline" size={16} color={Colors.primaryDark} />
          <Text variant="caption" color={Colors.primaryDark}>
            {t("hist.title")}
          </Text>
        </Pressable>
      </View>

      {/* Metric count cards — bosilganda filtrni o'zgartiradi (web kabi). */}
      <View style={styles.metricsRow}>
        {METRICS.map((m) => {
          const active = filter === m.key;
          const color = statusColorForMetric(Colors, m.key);
          return (
            <Pressable
              key={m.key}
              style={[styles.metricCard, active && { borderColor: color }]}
              onPress={() => setFilter(m.key)}
            >
              <View style={[styles.metricIcon, { backgroundColor: color + "22" }]}>
                <Ionicons name={m.icon} size={16} color={color} />
              </View>
              <Text variant="h2" style={styles.metricValue}>
                {metricValue(m.key)}
              </Text>
              <Text variant="label" muted numberOfLines={1}>
                {t(m.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Jonli countdown — eng yaqin bron (web BookingList kabi). */}
      {!!nextBooking && filter === "upcoming" && (
        <View style={styles.nextBanner}>
          <View style={styles.nextDot} />
          <Text variant="caption" color={Colors.primaryDarker} style={styles.flex} numberOfLines={1}>
            {t("booking.next_in")}: {localize(nextBooking.provider?.business_name, lang) || t("mybookings.unknown_provider")}
          </Text>
          <Badge label={countdown(nextBooking.booking_date, nextBooking.start_time, lang)} tone="warning" />
        </View>
      )}
    </View>
  );

  const renderCard = (item: Booking) => {
    const name = localize(item.provider?.business_name, lang) || t("mybookings.unknown_provider");
    const meta = statusMeta(item.status);
    const isUpcoming = UPCOMING.has(item.status);
    const cancellable = canCancel(item.booking_date, item.start_time);
    return (
      <View style={[styles.card, { borderLeftColor: statusColor(Colors, item.status), borderLeftWidth: 4 }]}>
        <View style={styles.cardTop}>
          <Avatar uri={item.provider?.avatar_url} name={name} size={52} />
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                {name}
              </Text>
              <Badge label={t(meta.key)} tone={meta.tone} />
            </View>
            <Text variant="caption" muted style={styles.date}>
              {formatDateFull(item.booking_date, lang)}
            </Text>
            <Text variant="caption" color={Colors.primaryDark}>
              {item.start_time?.slice(0, 5)}–{item.end_time?.slice(0, 5)}
              {item.duration_minutes ? ` · ${item.duration_minutes} ${t("common.min")}` : ""}
            </Text>
          </View>
          {isUpcoming && msUntilStart(item.booking_date, item.start_time) > 0 && (
            <Badge label={countdown(item.booking_date, item.start_time, lang)} tone="primary" />
          )}
        </View>

        {!!item.notes && (
          <Text variant="caption" muted style={styles.notes}>
            {t("booking.notes")}: {item.notes}
          </Text>
        )}

        <View style={styles.actions}>
          {item.provider?.slug && (
            <Button
              label={t("mybookings.view_details")}
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => router.push(`/provider/${item.provider!.slug}`)}
              style={styles.flex}
            />
          )}
          {isUpcoming && (
            <Button
              label={t("booking.cancel")}
              variant="outline"
              size="sm"
              fullWidth={false}
              icon="close"
              disabled={!cancellable}
              onPress={() => onCancel(item)}
            />
          )}
        </View>

        {/* Bekor qilish nega o'chiq — web bilan bir xil izoh (<24 soat). */}
        {isUpcoming && !cancellable && (
          <Text variant="label" muted style={styles.cancelNote}>
            {t("booking.cancel_window_note")}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={sections}
        keyExtractor={(s) => s.date ?? "flat"}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={loading && bookings.length > 0}
        renderItem={({ item: section }) => (
          <View>
            {section.date && (
              <View style={styles.dateHeader}>
                <View style={styles.dateChip}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.primaryDark} />
                  <Text variant="label" color={Colors.primaryDark}>
                    {formatDateFull(section.date, lang)}
                  </Text>
                </View>
                <View style={styles.dateLine} />
              </View>
            )}
            {section.items.map((b) => (
              <View key={b.id}>{renderCard(b)}</View>
            ))}
          </View>
        )}
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
              subtitle={filter === "all" ? t("hist.no_bookings_yet") : t("hist.no_filtered")}
              actionLabel={t("fav.explore")}
              onAction={() => router.push("/")}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

function statusColorForMetric(Colors: ColorPalette, k: Filter): string {
  if (k === "all") return Colors.primaryDark;
  if (k === "upcoming") return Colors.warning;
  if (k === "completed") return Colors.success;
  return Colors.danger;
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: "center" },
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.huge },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  historyLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  metricsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: spacing.sm,
    gap: 4,
    ...shadow.sm,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { lineHeight: 26 },
  nextBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  nextDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning },
  dateHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm, marginTop: spacing.xs },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border },
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
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  date: { marginTop: 2 },
  notes: { fontStyle: "italic" },
  actions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  cancelNote: { fontStyle: "italic" },
});
