import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar, Badge, Button, Chip, EmptyState, SkeletonCard, Text } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { formatDateFull } from "@/lib/format";
import { localize } from "@/lib/localize";

type Filter = "all" | "upcoming" | "completed" | "cancelled";

const UPCOMING = new Set(["upcoming", "pending", "confirmed"]);

function statusMeta(status: string): { tone: BadgeTone; key: any } {
  if (UPCOMING.has(status)) return { tone: "primary", key: "status.upcoming" };
  if (status === "completed") return { tone: "success", key: "status.completed" };
  return { tone: "danger", key: "status.cancelled" };
}

/** Boshlanishiga 24 soatdan ko'p bo'lsa bekor qilsa bo'ladi (Toshkent UTC+5). */
function canCancel(date: string, start: string): boolean {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = start.split(":").map(Number);
  const startUtc = Date.UTC(y, mo - 1, d, h, mi) - 5 * 3600000;
  return startUtc - Date.now() >= 24 * 3600000;
}

export default function BookingsScreen() {
  const { t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { bookings, loading, cancel, refetch } = useBookings();
  const [filter, setFilter] = useState<Filter>("all");

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filtered = useMemo(() => {
    if (filter === "all") return bookings;
    if (filter === "upcoming") return bookings.filter((b) => UPCOMING.has(b.status));
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text variant="h2" style={styles.title}>
        {t("booking.my_bookings")}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {(["all", "upcoming", "completed", "cancelled"] as Filter[]).map((f) => (
          <Chip
            key={f}
            label={t(f === "all" ? "status.all" : (`status.${f}` as any))}
            size="sm"
            active={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={loading && bookings.length > 0}
        renderItem={({ item }) => {
          const name = localize(item.provider?.business_name) || t("mybookings.unknown_provider");
          const meta = statusMeta(item.status);
          const showCancel = UPCOMING.has(item.status);
          return (
            <View style={styles.card}>
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
                {showCancel && (
                  <Button
                    label={t("booking.cancel")}
                    variant="outline"
                    size="sm"
                    fullWidth={false}
                    icon="close"
                    onPress={() => onCancel(item)}
                  />
                )}
              </View>
            </View>
          );
        }}
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
              subtitle={t("hist.no_bookings_yet")}
              actionLabel={t("fav.explore")}
              onAction={() => router.push("/")}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: "center" },
  flex: { flex: 1 },
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  filters: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },
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
  cardTop: { flexDirection: "row", gap: spacing.md },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  date: { marginTop: 2 },
  notes: { fontStyle: "italic" },
  actions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
});
