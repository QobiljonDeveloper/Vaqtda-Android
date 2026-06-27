import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar, Badge, Button, EmptyState, IconButton, Text } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import { useMyProvider } from "@/hooks/useMyProvider";
import { formatDateFull } from "@/lib/format";
import { localize } from "@/lib/localize";
import { supabase } from "@/lib/supabase";
import { addDaysStr, createTashkentClock } from "@/lib/tashkent";

const clock = createTashkentClock();
type IconName = keyof typeof Ionicons.glyphMap;

interface Busy {
  booking_date: string;
  start_time: string;
  end_time: string;
}

function statusTone(status: string): BadgeTone {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

export default function ProviderDashboard() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { provider, loading } = useMyProvider();
  const [busy, setBusy] = useState<Busy[]>([]);

  const today = clock.now().dateStr;

  useFocusEffect(
    useCallback(() => {
      if (!provider) return;
      supabase
        .rpc("get_busy_slots", { p_provider: provider.id, p_from: today, p_to: addDaysStr(today, 60) })
        .then(({ data }) => setBusy(((data as Busy[]) ?? []).sort(sortBusy)));
    }, [provider, today])
  );

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
  const upcoming = busy.filter((b) => b.booking_date > today || (b.booking_date === today && b.start_time >= clock.now().hhmm));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text variant="subtitle">{t("menu.provider_dashboard")}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* Biznes kartasi */}
        <View style={styles.bizCard}>
          <Avatar uri={provider.avatar_url} name={name} size={56} rounded={false} />
          <View style={styles.flex}>
            <Text variant="subtitle" numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.bizMeta}>
              <Ionicons name="star" size={13} color={Colors.star} />
              <Text variant="caption" muted>
                {(provider.rating ?? 0).toFixed(1)} ({provider.reviews_count ?? 0})
              </Text>
              <Badge label={provider.status} tone={statusTone(provider.status)} />
            </View>
          </View>
        </View>

        {/* Tezkor amallar */}
        <View style={styles.actions}>
          <ActionTile icon="create-outline" label={t("pdash.edit_business")} onPress={() => router.push("/provider/add-business")} />
          <ActionTile icon="calendar-outline" label={t("pdash.create_timetable")} onPress={() => router.push("/provider/create-timetable")} />
          <ActionTile icon="stats-chart-outline" label={t("pdash.stats")} onPress={() => router.push("/provider/stats")} />
        </View>

        {/* Bo'lajak bronlar */}
        <Text variant="title" style={styles.sectionTitle}>
          {t("pdash.upcoming_bookings")}
        </Text>
        {upcoming.length === 0 ? (
          <Text variant="body" muted style={styles.empty}>
            {t("pdash.no_bookings")}
          </Text>
        ) : (
          upcoming.slice(0, 30).map((b, i) => (
            <View key={`${b.booking_date}-${b.start_time}-${i}`} style={styles.bookingRow}>
              <View style={styles.bookingIcon}>
                <Ionicons name="time-outline" size={18} color={Colors.primaryDark} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong">{formatDateFull(b.booking_date, lang)}</Text>
                <Text variant="caption" muted>
                  {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.cta}>
          <Button label={t("pdash.create_timetable")} icon="calendar-outline" onPress={() => router.push("/provider/create-timetable")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function sortBusy(a: Busy, b: Busy) {
  if (a.booking_date !== b.booking_date) return a.booking_date < b.booking_date ? -1 : 1;
  return a.start_time < b.start_time ? -1 : 1;
}

function ActionTile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
  flexCenter: { flex: 1, justifyContent: "center" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  body: { padding: spacing.lg, paddingBottom: spacing.huge },
  bizCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.md,
    ...shadow.sm,
  },
  bizMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  tile: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    ...shadow.sm,
  },
  pressed: { opacity: 0.9 },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  empty: { paddingVertical: spacing.lg },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: Colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bookingIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: { marginTop: spacing.lg },
});
