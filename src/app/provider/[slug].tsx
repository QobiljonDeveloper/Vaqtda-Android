import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { FavoriteButton } from "@/components/FavoriteButton";
import { WaitlistJoinCard } from "@/components/WaitlistJoinCard";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { localize } from "@/lib/localize";
import { supabase } from "@/lib/supabase";
import { addMinutes, availableDates, freeStartTimes } from "@/lib/slots";
import type { BreakSlot, BusyBooking, WorkSlot } from "@/lib/slots";
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
  const [booking, setBooking] = useState(false);

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
        supabase
          .from("timetable_config")
          .select("*")
          .eq("provider_id", prov.id)
          .maybeSingle(),
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
        const opts =
          cfg.fixed_durations?.length > 0
            ? cfg.fixed_durations
            : [cfg.flexible_min || 30];
        setDuration(opts[0]);
      }
      const slots = (slotsRes.data as WorkSlot[]) ?? [];
      setWorkSlots(slots);
      setBreaks((brsRes.data as BreakSlot[]) ?? []);

      // Band vaqtlar: avval RPC (barcha foydalanuvchilar), bo'lmasa o'z bronlari.
      const maxDate = slots.reduce((m, s) => (s.slot_date > m ? s.slot_date : m), today);
      const rpc = await supabase.rpc("get_busy_slots", {
        p_provider: prov.id,
        p_from: today,
        p_to: maxDate,
      });
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
    return config.fixed_durations?.length > 0
      ? config.fixed_durations
      : [config.flexible_min || 30];
  }, [config]);

  const times = useMemo(() => {
    if (!date || !duration || !config) return [];
    const now = clock.now();
    return freeStartTimes(
      date,
      duration,
      config.buffer_minutes ?? 0,
      workSlots,
      breaks,
      bookings,
      now.dateStr,
      now.hhmm
    );
  }, [date, duration, config, workSlots, breaks, bookings]);

  // Navbat (waitlist) uchun: har kun to'la (band)mi yoki bo'shmi.
  const minDur = durationOptions[0] ?? 30;
  const dayAvailability = useMemo(() => {
    if (!config) return [] as { date: string; isFull: boolean }[];
    const now = clock.now();
    return dates.map((d) => {
      const free = freeStartTimes(
        d,
        minDur,
        config.buffer_minutes ?? 0,
        workSlots,
        breaks,
        bookings,
        now.dateStr,
        now.hhmm
      ).length > 0;
      return { date: d, isFull: !free };
    });
  }, [dates, config, minDur, workSlots, breaks, bookings]);

  const fullDays = useMemo(
    () => dayAvailability.filter((x) => x.isFull).map((x) => x.date),
    [dayAvailability]
  );
  const freeDays = useMemo(
    () =>
      dayAvailability
        .filter((x) => !x.isFull)
        .map((x) => ({ date: x.date, label: x.date === today ? t("date.today") : x.date.slice(5) })),
    [dayAvailability, today, t]
  );

  const onBook = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!time || !duration || !provider) return;
    setBooking(true);
    const endTime = addMinutes(time, duration);
    const { error } = await supabase.from("bookings").insert({
      client_id: user!.id,
      provider_id: provider.id,
      booking_date: date,
      start_time: time,
      end_time: endTime,
      duration_minutes: duration,
      status: "upcoming",
    });
    setBooking(false);

    if (error) {
      Alert.alert(t("booking.conflict"), t("booking.conflict_desc"), [
        { text: t("booking.ok") },
      ]);
      // Band vaqtni ro'yxatga qo'shamiz (qayta tanlamaslik uchun)
      setBookings((p) => [
        ...p,
        { booking_date: date, start_time: time, end_time: endTime },
      ]);
      setTime("");
      return;
    }

    Alert.alert(t("booking.success"), t("booking.success_desc"), [
      { text: t("booking.ok"), onPress: () => router.push("/bookings") },
    ]);
    setBookings((p) => [
      ...p,
      { booking_date: date, start_time: time, end_time: endTime },
    ]);
    setTime("");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>{t("booking.provider_not_found")}</Text>
      </View>
    );
  }

  const name = localize(provider.business_name) || provider.slug;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Provider header */}
      <View style={styles.header}>
        <Image source={{ uri: provider.avatar_url }} style={styles.avatar} />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.category}>{localize(provider.category_name)}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={15} color={Colors.star} />
          <Text style={styles.rating}>
            {(provider.rating ?? 0).toFixed(1)} ({provider.reviews_count ?? 0})
          </Text>
          <FavoriteButton providerId={provider.id} size={22} />
        </View>
        {!!localize(provider.region_name) && (
          <Text style={styles.region}>
            <Ionicons name="location-outline" size={13} />{" "}
            {localize(provider.region_name)}
          </Text>
        )}
      </View>

      {!!localize(provider.about) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("booking.about")}</Text>
          <Text style={styles.about}>{localize(provider.about)}</Text>
        </View>
      )}

      {/* Booking */}
      {!config || dates.length === 0 ? (
        <View style={styles.section}>
          <Text style={styles.noSchedule}>{t("booking.no_schedule")}</Text>
        </View>
      ) : (
        <>
          {/* Davomiylik */}
          {durationOptions.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("booking.duration")}</Text>
              <View style={styles.chipRow}>
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
            </View>
          )}

          {/* Sana */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("booking.pick_date")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
          </View>

          {/* Vaqt */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("booking.pick_time")}</Text>
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
                    <Text
                      style={[
                        styles.timeText,
                        time === tm && styles.timeTextActive,
                      ]}
                    >
                      {tm}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Tasdiqlash */}
          <Pressable
            style={[styles.bookBtn, (!time || booking) && styles.bookBtnDisabled]}
            onPress={onBook}
            disabled={!time || booking}
          >
            {booking ? (
              <ActivityIndicator color={Colors.primaryForeground} />
            ) : (
              <Text style={styles.bookText}>
                {isAuthenticated
                  ? t("common.book_now")
                  : t("booking.login_and_book")}
              </Text>
            )}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  notFound: { color: Colors.textMuted, fontSize: 16 },
  header: { alignItems: "center", padding: 20, gap: 4 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.border,
    marginBottom: 6,
  },
  name: { fontSize: 22, fontWeight: "800", color: Colors.text },
  category: { fontSize: 14, color: Colors.primaryDark, fontWeight: "600" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  rating: { fontSize: 14, color: Colors.text, fontWeight: "600" },
  region: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  section: { paddingHorizontal: 16, paddingVertical: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 10,
  },
  about: { fontSize: 14, color: Colors.textMuted, lineHeight: 21 },
  noSchedule: { color: Colors.textMuted, textAlign: "center", paddingVertical: 20 },
  noTime: { color: Colors.textMuted, paddingVertical: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: Colors.primaryForeground },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  timeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeText: { color: Colors.text, fontWeight: "600" },
  timeTextActive: { color: Colors.primaryForeground },
  bookBtn: {
    backgroundColor: Colors.primary,
    margin: 16,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBtnDisabled: { opacity: 0.5 },
  bookText: { color: Colors.primaryForeground, fontWeight: "800", fontSize: 16 },
});
