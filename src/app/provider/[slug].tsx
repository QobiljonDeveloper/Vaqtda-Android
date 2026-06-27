import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FavoriteButton } from "@/components/FavoriteButton";
import { Gallery } from "@/components/Gallery";
import { MapCard } from "@/components/MapCard";
import { ReviewsSection } from "@/components/ReviewsSection";
import { WaitlistJoinCard } from "@/components/WaitlistJoinCard";
import { Avatar, Button, Chip, IconButton, Input, Sheet, Stars, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatDateFull } from "@/lib/format";
import { localize } from "@/lib/localize";
import { addMinutes, availableDates, freeStartTimes } from "@/lib/slots";
import type { BreakSlot, BusyBooking, WorkSlot } from "@/lib/slots";
import { supabase } from "@/lib/supabase";
import { createTashkentClock } from "@/lib/tashkent";

const clock = createTashkentClock();

interface Config {
  duration_type: "fixed" | "flexible";
  fixed_durations: number[];
  flexible_min: number;
  buffer_minutes: number;
}

export default function ProviderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [provider, setProvider] = useState<any>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [workSlots, setWorkSlots] = useState<WorkSlot[]>([]);
  const [breaks, setBreaks] = useState<BreakSlot[]>([]);
  const [bookings, setBookings] = useState<BusyBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [booking, setBooking] = useState(false);

  // Sharhlardan jonli reyting
  const [live, setLive] = useState<{ avg: number; count: number } | null>(null);

  const today = clock.now().dateStr;

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: prov } = await supabase
        .from("provider_search_view")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!prov) {
        setLoading(false);
        return;
      }
      setProvider(prov);

      const [cfgRes, slotsRes, brsRes] = await Promise.all([
        supabase.from("timetable_config").select("*").eq("provider_id", prov.id).maybeSingle(),
        supabase
          .from("timetable_slots")
          .select("slot_date,start_time,end_time")
          .eq("provider_id", prov.id)
          .eq("is_available", true)
          .gte("slot_date", today),
        supabase
          .from("timetable_breaks")
          .select("slot_date,start_time,end_time")
          .eq("provider_id", prov.id)
          .gte("slot_date", today),
      ]);

      const cfg = cfgRes.data as Config | null;
      if (cfg) {
        setConfig(cfg);
        const opts = cfg.fixed_durations?.length > 0 ? cfg.fixed_durations : [cfg.flexible_min || 30];
        setDuration(opts[0]);
      }
      const slots = (slotsRes.data as WorkSlot[]) ?? [];
      setWorkSlots(slots);
      setBreaks((brsRes.data as BreakSlot[]) ?? []);

      const maxDate = slots.reduce((m, s) => (s.slot_date > m ? s.slot_date : m), today);
      const rpc = await supabase.rpc("get_busy_slots", { p_provider: prov.id, p_from: today, p_to: maxDate });
      if (!rpc.error && rpc.data) {
        setBookings(rpc.data as BusyBooking[]);
      } else {
        const { data: bk } = await supabase
          .from("bookings")
          .select("booking_date,start_time,end_time")
          .eq("provider_id", prov.id)
          .gte("booking_date", today);
        setBookings((bk as BusyBooking[]) ?? []);
      }

      const dates = availableDates(slots, today);
      if (dates.length) setDate(dates[0]);
      setLoading(false);
    })();
  }, [slug]);

  const dates = useMemo(() => availableDates(workSlots, today), [workSlots, today]);

  const durationOptions = useMemo(() => {
    if (!config) return [];
    return config.fixed_durations?.length > 0 ? config.fixed_durations : [config.flexible_min || 30];
  }, [config]);

  const times = useMemo(() => {
    if (!date || !duration || !config) return [];
    const now = clock.now();
    return freeStartTimes(date, duration, config.buffer_minutes ?? 0, workSlots, breaks, bookings, now.dateStr, now.hhmm);
  }, [date, duration, config, workSlots, breaks, bookings]);

  const minDur = durationOptions[0] ?? 30;
  const dayAvailability = useMemo(() => {
    if (!config) return [] as { date: string; isFull: boolean }[];
    const now = clock.now();
    return dates.map((d) => {
      const free =
        freeStartTimes(d, minDur, config.buffer_minutes ?? 0, workSlots, breaks, bookings, now.dateStr, now.hhmm)
          .length > 0;
      return { date: d, isFull: !free };
    });
  }, [dates, config, minDur, workSlots, breaks, bookings]);

  const fullDays = useMemo(() => dayAvailability.filter((x) => x.isFull).map((x) => x.date), [dayAvailability]);
  const freeDays = useMemo(
    () =>
      dayAvailability
        .filter((x) => !x.isFull)
        .map((x) => ({ date: x.date, label: x.date === today ? t("date.today") : x.date.slice(5) })),
    [dayAvailability, today, t]
  );

  const requestBook = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!time || !duration || !provider) return;
    setConfirmOpen(true);
  };

  const confirmBook = async () => {
    if (!time || !duration || !provider || !user) return;
    setBooking(true);
    const endTime = addMinutes(time, duration);
    const { error } = await supabase.from("bookings").insert({
      client_id: user.id,
      provider_id: provider.id,
      booking_date: date,
      start_time: time,
      end_time: endTime,
      duration_minutes: duration,
      status: "upcoming",
      notes: note.trim() || null,
    });
    setBooking(false);
    setConfirmOpen(false);

    setBookings((p) => [...p, { booking_date: date, start_time: time, end_time: endTime }]);
    setTime("");
    setNote("");

    if (error) {
      Alert.alert(t("booking.conflict"), t("booking.conflict_desc"), [{ text: t("booking.ok") }]);
      return;
    }
    Alert.alert(t("booking.success"), t("booking.success_desc"), [
      { text: t("booking.ok"), onPress: () => router.push("/bookings") },
    ]);
  };

  // Barqaror referens — aks holda ReviewsSection effect'i cheksiz loop'ga tushadi.
  const handleAggregate = useCallback((avg: number, count: number) => setLive({ avg, count }), []);

  const onShare = useCallback(() => {
    if (!provider) return;
    const name = localize(provider.business_name) || provider.slug;
    Share.share({ message: `${t("share.message", { name })}\nhttps://vaqtda.uz/${provider.slug}` }).catch(
      () => {}
    );
  }, [provider, t]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text variant="subtitle" muted>
          {t("booking.provider_not_found")}
        </Text>
        <Button label={t("common.back")} onPress={() => router.back()} fullWidth={false} variant="secondary" />
      </SafeAreaView>
    );
  }

  const name = localize(provider.business_name) || provider.slug;
  const region = localize(provider.region_name);
  const about = localize(provider.about);
  const ratingVal = live?.avg ?? provider.rating ?? 0;
  const reviewsVal = live?.count ?? provider.reviews_count ?? 0;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Header */}
      <View style={styles.topbar}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <View style={styles.topbarRight}>
          <IconButton icon="share-outline" onPress={onShare} />
          <FavoriteButton providerId={provider.id} size={24} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Provider header */}
        <View style={styles.head}>
          <Avatar uri={provider.avatar_url} name={name} size={96} ring />
          <Text variant="h1" center style={styles.name}>
            {name}
          </Text>
          {!!localize(provider.category_name) && (
            <Text variant="subtitle" color={Colors.primaryDark}>
              {localize(provider.category_name)}
            </Text>
          )}
          <View style={styles.ratingRow}>
            <Stars value={ratingVal} size={16} />
            <Text variant="bodyStrong">{ratingVal.toFixed(1)}</Text>
            <Text variant="caption" muted>
              ({reviewsVal})
            </Text>
          </View>
          {!!region && (
            <View style={styles.regionRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
              <Text variant="caption" muted>
                {region}
              </Text>
            </View>
          )}
        </View>

        {/* About */}
        {!!about && (
          <Section title={t("booking.about")}>
            <Text variant="body" muted style={styles.about}>
              {about}
            </Text>
          </Section>
        )}

        {/* Galereya */}
        <Gallery providerId={provider.id} title={t("profile.gallery")} />

        {/* Booking */}
        {!config || dates.length === 0 ? (
          <Section title={t("booking.title")}>
            <Text variant="body" muted center style={styles.noSchedule}>
              {t("booking.no_schedule_desc")}
            </Text>
          </Section>
        ) : (
          <Section title={t("booking.title")}>
            {durationOptions.length > 1 && (
              <>
                <Text variant="bodyStrong" style={styles.label}>
                  {t("booking.duration")}
                </Text>
                <View style={styles.chipWrap}>
                  {durationOptions.map((d) => (
                    <Chip
                      key={d}
                      label={`${d} ${t("common.min")}`}
                      active={duration === d}
                      onPress={() => {
                        setDuration(d);
                        setTime("");
                      }}
                    />
                  ))}
                </View>
              </>
            )}

            <Text variant="bodyStrong" style={styles.label}>
              {t("booking.pick_date")}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {dates.map((d) => (
                <Chip
                  key={d}
                  label={d === today ? t("date.today") : d.slice(5)}
                  active={date === d}
                  onPress={() => {
                    setDate(d);
                    setTime("");
                  }}
                />
              ))}
            </ScrollView>

            <Text variant="bodyStrong" style={styles.label}>
              {t("booking.pick_time")}
            </Text>
            {times.length === 0 ? (
              <WaitlistJoinCard
                providerId={provider.id}
                desiredDate={date}
                durationMinutes={minDur}
                fullDays={fullDays}
                freeDays={freeDays}
                onPickDate={(d) => {
                  setDate(d);
                  setTime("");
                }}
              />
            ) : (
              <View style={styles.timeGrid}>
                {times.map((tm) => (
                  <Pressable
                    key={tm}
                    style={[styles.timeChip, time === tm && styles.timeChipActive]}
                    onPress={() => setTime(tm)}
                  >
                    <Text style={[styles.timeText, time === tm && styles.timeTextActive]}>{tm}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {times.length > 0 && (
              <View style={styles.bookBtn}>
                <Button
                  label={isAuthenticated ? t("common.book_now") : t("booking.login_and_book")}
                  onPress={requestBook}
                  disabled={!time}
                  size="lg"
                />
              </View>
            )}
          </Section>
        )}

        {/* Xarita */}
        {!!provider.location && (
          <Section title={t("booking.location")}>
            <MapCard location={provider.location} label={t("profile.open_map")} title={name} />
          </Section>
        )}

        {/* Sharhlar */}
        <Section title="">
          <ReviewsSection providerId={provider.id} onAggregate={handleAggregate} />
        </Section>
      </ScrollView>

      {/* Tasdiqlash sheet */}
      <Sheet visible={confirmOpen} onClose={() => setConfirmOpen(false)} title={t("booking.confirm_title")}>
        <View style={styles.confirmRows}>
          <ConfirmRow icon="person-outline" label={t("booking.provider_label")} value={name} />
          <ConfirmRow icon="calendar-outline" label={t("booking.date_label")} value={formatDateFull(date, lang)} />
          <ConfirmRow icon="time-outline" label={t("booking.time_label")} value={`${time} · ${duration} ${t("common.min")}`} />
        </View>
        <Input
          label={t("booking.note_label")}
          placeholder={t("booking.note_placeholder")}
          value={note}
          onChangeText={setNote}
          multiline
        />
        <View style={styles.confirmBtn}>
          <Button label={t("common.confirm")} onPress={confirmBook} loading={booking} size="lg" />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {!!title && (
        <Text variant="title" style={styles.sectionTitle}>
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

function ConfirmRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.confirmRow}>
      <Ionicons name={icon} size={18} color={Colors.primaryDark} />
      <Text variant="caption" muted style={styles.confirmLabel}>
        {label}
      </Text>
      <Text variant="bodyStrong" style={styles.confirmValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, backgroundColor: Colors.background },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  topbarRight: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  content: { paddingBottom: spacing.huge },
  head: { alignItems: "center", paddingHorizontal: spacing.lg, gap: 4 },
  name: { marginTop: spacing.sm },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  regionRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  about: { lineHeight: 22 },
  noSchedule: { paddingVertical: spacing.lg },
  label: { marginBottom: spacing.sm, marginTop: spacing.md },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chipRow: { gap: spacing.sm, paddingRight: spacing.lg },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timeChip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: Colors.white,
  },
  timeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeText: { color: Colors.text, fontWeight: "600" },
  timeTextActive: { color: Colors.primaryForeground },
  bookBtn: { marginTop: spacing.lg },
  confirmRows: { gap: spacing.sm, marginBottom: spacing.md },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  confirmLabel: { width: 70 },
  confirmValue: { flex: 1, textAlign: "right" },
  confirmBtn: { marginTop: spacing.lg },
});
