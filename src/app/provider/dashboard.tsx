import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DayTimeline, type TimelineEntry } from "@/components/DayTimeline";
import { Avatar, Badge, Button, EmptyState, IconButton, Skeleton, Text } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { type ColorPalette } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useMyProvider } from "@/hooks/useMyProvider";
import { localize } from "@/lib/localize";
import { supabase } from "@/lib/supabase";
import {
  addDaysStr,
  createTashkentClock,
  RU_WEEKDAYS_SHORT,
  UZ_WEEKDAYS_SHORT,
  weekdayKeyOf,
} from "@/lib/tashkent";

const clock = createTashkentClock();
type IconName = keyof typeof Ionicons.glyphMap;

/** Web bilan bir xil: get_busy_slots faqat vaqt oraliqlarini qaytaradi. */
interface Busy {
  booking_date: string;
  start_time: string;
  end_time: string;
}

/** Provayder o'z bronlarini o'qiy olsa — boyitilgan ma'lumot (RLS ruxsat bersa). */
interface RichBooking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  status: string | null;
  notes: string | null;
  client_name: string | null;
}

const HORIZON_DAYS = 60;

function providerStatusTone(status: string): BadgeTone {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

export default function ProviderDashboard() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { provider, loading } = useMyProvider();

  const [busy, setBusy] = useState<Busy[]>([]);
  const [rich, setRich] = useState<RichBooking[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const now = clock.now();
  const today = now.dateStr;
  const [selectedDate, setSelectedDate] = useState(today);

  const load = useCallback(async () => {
    if (!provider) {
      setBusy([]);
      setRich([]);
      setDataLoading(false);
      return;
    }
    const to = addDaysStr(today, HORIZON_DAYS);

    // 1) Asosiy manba (web bilan bir xil): get_busy_slots — barcha band vaqt oraliqlari.
    const busyP = supabase
      .rpc("get_busy_slots", { p_provider: provider.id, p_from: today, p_to: to })
      .then(
        ({ data }) => ((data as Busy[]) ?? []),
        () => [] as Busy[]
      );

    // 2) Boyitilgan ma'lumot: provayder o'z bronlarini o'qiy olsa (RLS). Ruxsat
    //    bo'lmasa jimgina bo'sh qaytadi — timeline baribir vaqt oraliqlari bilan ishlaydi.
    const richP = supabase
      .from("bookings")
      .select(
        "id, booking_date, start_time, end_time, duration_minutes, status, notes, client:profiles(full_name)"
      )
      .eq("provider_id", provider.id)
      .neq("status", "cancelled")
      .gte("booking_date", today)
      .lte("booking_date", to)
      .then(
        ({ data, error }) => {
          if (error || !data) return [] as RichBooking[];
          return (data as any[]).map((b) => {
            const c = Array.isArray(b.client) ? b.client[0] : b.client;
            return {
              id: b.id,
              booking_date: b.booking_date,
              start_time: b.start_time,
              end_time: b.end_time,
              duration_minutes: b.duration_minutes ?? null,
              status: b.status ?? null,
              notes: b.notes ?? null,
              client_name: c?.full_name ?? null,
            } as RichBooking;
          });
        },
        () => [] as RichBooking[]
      );

    const [busyData, richData] = await Promise.all([busyP, richP]);
    setBusy(busyData);
    setRich(richData);
    setDataLoading(false);
  }, [provider, today]);

  useFocusEffect(
    useCallback(() => {
      setDataLoading(true);
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const durationLabel = useCallback(
    (min: number) => {
      if (min < 60) return `${min} ${t("unit.min")}`;
      const h = Math.floor(min / 60);
      const m = min % 60;
      return m > 0
        ? `${h}${t("unit.hour_short")} ${m}${t("unit.min_short")}`
        : `${h} ${t("unit.hour")}`;
    },
    [t]
  );

  const statusLabel = useCallback(
    (status: string) => {
      const key = `pdash.status.${status}`;
      const translated = t(key as any);
      // t() topilmasa kalitning o'zini qaytaradi — bunda xom statusni ko'rsatamiz.
      return translated === key ? status.replace(/_/g, " ") : translated;
    },
    [t]
  );

  // Band kunlar to'plami (chiplarda nuqta ko'rsatish uchun).
  // Yagona manba: o'z bronlari (rich) bo'lsa undan; aks holda (RLS) vaqt oralig'idan.
  const busyDates = useMemo(
    () => new Set((rich.length ? rich : busy).map((b) => b.booking_date)),
    [rich, busy]
  );

  // Keyingi 14 kun sana chiplari
  const dateChips = useMemo(() => {
    const shortMap = lang === "ru" ? RU_WEEKDAYS_SHORT : UZ_WEEKDAYS_SHORT;
    const tomorrow = addDaysStr(today, 1);
    return Array.from({ length: 14 }, (_, i) => {
      const date = addDaysStr(today, i);
      return {
        date,
        dayNum: String(Number(date.split("-")[2])),
        label:
          date === today
            ? lang === "ru"
              ? "Сегодня"
              : "Bugun"
            : date === tomorrow
              ? lang === "ru"
                ? "Завтра"
                : "Ertaga"
              : shortMap[weekdayKeyOf(date)] || "",
        hasBookings: busyDates.has(date),
      };
    });
  }, [today, lang, busyDates]);

  // Tanlangan kun jadvali: boyitilgan bron bo'lsa undan, bo'lmasa vaqt oralig'idan.
  const dayEntries = useMemo<TimelineEntry[]>(() => {
    const richForDay = rich.filter((b) => b.booking_date === selectedDate);
    let entries: TimelineEntry[];
    if (richForDay.length > 0) {
      entries = richForDay.map((b) => ({
        id: b.id,
        start_time: b.start_time,
        end_time: b.end_time,
        clientName: b.client_name,
        durationMinutes: b.duration_minutes,
        status: b.status,
        notes: b.notes,
      }));
    } else {
      entries = busy
        .filter((b) => b.booking_date === selectedDate)
        .map((b, i) => ({
          id: `${b.booking_date}-${b.start_time}-${i}`,
          start_time: b.start_time,
          end_time: b.end_time,
        }));
    }
    return entries.sort((a, b) => (a.start_time < b.start_time ? -1 : 1));
  }, [rich, busy, selectedDate]);

  // Summary: bugungi bronlar soni va jami bo'lajak — busyDates bilan bir xil manba.
  const summary = useMemo(() => {
    const src: { booking_date: string; end_time: string }[] = rich.length ? rich : busy;
    const todayCount = src.filter((b) => b.booking_date === today).length;
    const upcomingCount = src.filter(
      (b) => b.booking_date > today || (b.booking_date === today && b.end_time.slice(0, 5) > now.hhmm)
    ).length;
    return { todayCount, upcomingCount };
  }, [rich, busy, today, now.hhmm]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" onPress={() => router.back()} />
        </View>
        <View style={styles.flexCenter}>
          <EmptyState
            icon="briefcase-outline"
            title={t("pdash.become_provider")}
            subtitle={t("pdash.become_desc")}
            actionLabel={t("menu.add_business")}
            onAction={() => router.push("/provider/add-business")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const name = localize(provider.business_name) || provider.slug;
  const subtitle = localize(provider.about);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text variant="title" style={styles.headerTitle}>
          {t("menu.provider_dashboard")}
        </Text>
        <View style={styles.headerAvatar}>
          <Avatar uri={provider.avatar_url} name={name} size={40} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Biznes kartasi */}
        <View style={styles.bizCard}>
          <Avatar uri={provider.avatar_url} name={name} size={64} />
          <View style={styles.flex}>
            <Text variant="subtitle" numberOfLines={1}>
              {name}
            </Text>
            {subtitle ? (
              <Text variant="caption" muted numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
            <View style={styles.bizMeta}>
              <Ionicons name="star" size={13} color={Colors.star} />
              <Text variant="caption" muted>
                {(provider.rating ?? 0).toFixed(1)} ({provider.reviews_count ?? 0})
              </Text>
              <Badge label={provider.status} tone={providerStatusTone(provider.status)} />
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
            onPress={() => router.push("/provider/add-business")}
          >
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Summary kartalari */}
        <View style={styles.statsRow}>
          <StatCard icon="calendar" value={summary.todayCount} label={t("pdash.today_count")} />
          <StatCard
            icon="time"
            tone="info"
            value={summary.upcomingCount}
            label={t("pdash.upcoming_count")}
          />
        </View>

        {/* Tezkor amallar */}
        <View style={styles.actions}>
          <ActionTile
            icon="create-outline"
            label={t("pdash.edit_business")}
            onPress={() => router.push("/provider/add-business")}
          />
          <ActionTile
            icon="calendar-outline"
            label={t("pdash.create_timetable")}
            onPress={() => router.push("/provider/create-timetable")}
          />
          <ActionTile
            icon="stats-chart-outline"
            label={t("pdash.stats")}
            onPress={() => router.push("/provider/stats")}
          />
        </View>

        {/* Kunlik jadval (timeline) */}
        <Text variant="title" style={styles.sectionTitle}>
          {t("pdash.day_schedule")}
        </Text>

        {/* Sana tanlagich */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
        >
          {dateChips.map((d) => {
            const active = d.date === selectedDate;
            return (
              <Pressable
                key={d.date}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDate(d.date);
                }}
                style={[styles.dateChip, active ? styles.dateChipActive : styles.dateChipIdle]}
              >
                <Text
                  variant="caption"
                  style={[styles.dateLabel, active && styles.dateLabelActive]}
                  muted={!active}
                >
                  {d.label.toUpperCase()}
                </Text>
                <Text variant="title" style={active ? styles.dateNumActive : styles.dateNum}>
                  {d.dayNum}
                </Text>
                {d.hasBookings ? (
                  <View
                    style={[
                      styles.dateDot,
                      { backgroundColor: active ? Colors.primaryForeground : Colors.primary },
                    ]}
                  />
                ) : (
                  <View style={styles.dateDotPlaceholder} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Timeline tanasi */}
        {dataLoading ? (
          <View style={styles.skeletonWrap}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <Skeleton width={44} height={32} radius={8} />
                <Skeleton width="100%" height={88} radius={radius.xl} style={styles.skeletonCard} />
              </View>
            ))}
          </View>
        ) : dayEntries.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptySlot}>
              <Text variant="caption" muted>
                {t("pdash.free_slot")}
              </Text>
            </View>
            <EmptyState
              icon="cafe-outline"
              title={t("pdash.free_day")}
              subtitle={t("pdash.free_day_desc")}
            />
          </View>
        ) : (
          <DayTimeline
            entries={dayEntries}
            isToday={selectedDate === today}
            nowHhmm={now.hhmm}
            durationLabel={durationLabel}
            statusLabel={statusLabel}
          />
        )}
      </ScrollView>

      {/* Suzuvchi amal tugmasi */}
      <View style={styles.fab}>
        <Button
          label={t("pdash.create_timetable")}
          icon="add"
          onPress={() => router.push("/provider/create-timetable")}
        />
      </View>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  value,
  label,
  tone = "primary",
}: {
  icon: IconName;
  value: number;
  label: string;
  tone?: "primary" | "info";
}) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useLanguage();
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color={tone === "info" ? Colors.info : Colors.primary} />
      <Text variant="caption" muted numberOfLines={1} style={styles.statLabel}>
        {label}
      </Text>
      <Text variant="title" style={styles.statValue}>
        {value} {t("pdash.unit_bookings")}
      </Text>
    </View>
  );
}

function ActionTile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={({ pressed }) => [styles.tile, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={22} color={Colors.primaryDark} />
      </View>
      <Text variant="caption" center numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (Colors: ColorPalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.background,
    },
    flexCenter: { flex: 1, justifyContent: "center" },
    flex: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    headerTitle: { flex: 1, color: Colors.primary },
    headerAvatar: {
      borderRadius: radius.pill,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: Colors.border,
    },
    body: { padding: spacing.lg, paddingBottom: 120, gap: spacing.lg },

    // Biznes kartasi
    bizCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: Colors.cardElevated,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: spacing.md,
      ...shadow.md,
    },
    bizMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4 },
    editBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: Colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    // Stat kartalari
    statsRow: { flexDirection: "row", gap: spacing.sm },
    statCard: {
      flex: 1,
      gap: spacing.xs,
      backgroundColor: Colors.cardElevated,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: spacing.lg,
      ...shadow.md,
    },
    statLabel: { marginTop: spacing.sm },
    statValue: { marginTop: 2 },

    // Tezkor amallar
    actions: { flexDirection: "row", gap: spacing.sm },
    tile: {
      flex: 1,
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: Colors.cardElevated,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
      ...shadow.sm,
    },
    pressed: { opacity: 0.85 },
    tileIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: Colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    sectionTitle: { marginTop: spacing.sm },

    // Sana tanlagich (to'liq yumaloq pill)
    dateRow: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
    dateChip: {
      width: 68,
      height: 80,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    dateChipActive: {
      backgroundColor: Colors.primarySoft,
      borderColor: Colors.primarySoft,
      ...shadow.sm,
    },
    dateChipIdle: { backgroundColor: Colors.cardElevated, borderColor: Colors.border },
    dateLabel: { fontSize: 11, letterSpacing: 0.5 },
    dateLabelActive: { color: Colors.primaryDarker },
    dateNum: { color: Colors.text },
    dateNumActive: { color: Colors.primaryDarker },
    dateDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
    dateDotPlaceholder: { width: 6, height: 6, marginTop: 2 },

    // Timeline holatlari
    skeletonWrap: { gap: spacing.lg },
    skeletonRow: { flexDirection: "row", gap: spacing.lg, alignItems: "flex-start" },
    skeletonCard: { flex: 1 },
    emptyWrap: { paddingTop: spacing.sm },
    emptySlot: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: Colors.borderStrong,
      backgroundColor: Colors.background,
      paddingVertical: spacing.xl,
      alignItems: "center",
      marginBottom: spacing.lg,
    },

    // Suzuvchi tugma
    fab: {
      position: "absolute",
      left: spacing.lg,
      right: spacing.lg,
      bottom: spacing.xl,
    },
  });
