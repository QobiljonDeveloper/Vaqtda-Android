import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip, EmptyState, IconButton, Text } from "@/components/ui";
import { Colors, type ColorPalette } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useMyProvider } from "@/hooks/useMyProvider";
import { formatPrice } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { addDaysStr, createTashkentClock, weekdayKeyOf } from "@/lib/tashkent";

const clock = createTashkentClock();
type Period = "all" | "30" | "7";

interface Bk {
  client_id: string;
  booking_date: string;
  status: string;
  duration_minutes: number | null;
  price: number | null;
}

const WD = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WD_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

export default function StatsScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { provider } = useMyProvider();
  const [rows, setRows] = useState<Bk[]>([]);
  const [period, setPeriod] = useState<Period>("all");

  useFocusEffect(
    useCallback(() => {
      if (!provider) return;
      supabase
        .from("bookings")
        .select("client_id, booking_date, status, duration_minutes, price")
        .eq("provider_id", provider.id)
        .then(
          ({ data }) => setRows((data as Bk[]) ?? []),
          () => setRows([])
        );
    }, [provider])
  );

  const today = clock.now().dateStr;
  const filtered = useMemo(() => {
    if (period === "all") return rows;
    const days = period === "30" ? 30 : 7;
    const from = addDaysStr(today, -days);
    return rows.filter((r) => r.booking_date >= from);
  }, [rows, period, today]);

  const stats = useMemo(() => {
    const notCancelled = filtered.filter((r) => r.status !== "cancelled");
    const completed = filtered.filter((r) => r.status === "completed");
    const upcoming = filtered.filter((r) => ["upcoming", "pending", "confirmed"].includes(r.status));
    const cancelled = filtered.filter((r) => r.status === "cancelled");
    const revenue = completed.reduce((s, r) => s + (r.price ?? 0), 0);
    const clients = new Set(notCancelled.map((r) => r.client_id)).size;

    const byWeekday = WD.map((wd) => notCancelled.filter((r) => weekdayKeyOf(r.booking_date) === wd).length);

    return {
      total: filtered.length,
      completed: completed.length,
      upcoming: upcoming.length,
      cancelled: cancelled.length,
      revenue,
      clients,
      byWeekday,
    };
  }, [filtered]);

  const maxWd = Math.max(1, ...stats.byWeekday);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text variant="subtitle">{t("stats.title")}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.periodRow}>
          <Chip label={t("status.all")} size="sm" active={period === "all"} onPress={() => setPeriod("all")} />
          <Chip label={t("stats.last30")} size="sm" active={period === "30"} onPress={() => setPeriod("30")} />
          <Chip label={t("stats.last7")} size="sm" active={period === "7"} onPress={() => setPeriod("7")} />
        </View>

        {rows.length === 0 ? (
          <EmptyState icon="stats-chart-outline" title={t("stats.empty")} />
        ) : (
          <>
            {/* Kartalar */}
            <View style={styles.grid}>
              <StatCard label={t("stats.revenue")} value={formatPrice(stats.revenue, lang)} icon wide />
              <StatCard label={t("stats.total_bookings")} value={String(stats.total)} />
              <StatCard label={t("stats.upcoming")} value={String(stats.upcoming)} tone={Colors.primaryDark} />
              <StatCard label={t("stats.completed")} value={String(stats.completed)} tone={Colors.success} />
              <StatCard label={t("stats.cancelled")} value={String(stats.cancelled)} tone={Colors.danger} />
              <StatCard label={t("stats.clients")} value={String(stats.clients)} />
            </View>

            {/* Hafta kunlari */}
            <Text variant="title" style={styles.chartTitle}>
              {t("stats.by_weekday")}
            </Text>
            <View style={styles.chart}>
              {stats.byWeekday.map((c, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: `${(c / maxWd) * 100}%` }]} />
                  </View>
                  <Text variant="caption" muted>
                    {WD_SHORT[i]}
                  </Text>
                  <Text variant="caption" color={Colors.text}>
                    {c}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  tone,
  wide = false,
}: {
  label: string;
  value: string;
  tone?: string;
  icon?: boolean;
  wide?: boolean;
}) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, wide && styles.cardWide]}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="h2" color={tone ?? Colors.text} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  body: { padding: spacing.lg, paddingBottom: spacing.huge },
  periodRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.lg,
    gap: 4,
    ...shadow.sm,
  },
  cardWide: { width: "100%" },
  chartTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 180,
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.md,
    ...shadow.sm,
  },
  barCol: { flex: 1, alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" },
  barTrack: { flex: 1, width: 18, justifyContent: "flex-end" },
  bar: { width: 18, backgroundColor: Colors.primary, borderRadius: 6, minHeight: 4 },
});
