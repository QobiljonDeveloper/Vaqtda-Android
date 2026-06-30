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
import { Colors, type ColorPalette } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatDateFull } from "@/lib/format";
import { localize } from "@/lib/localize";
import { addMinutes, availableDates, freeStartTimes, isSlotFree, timeToMin } from "@/lib/slots";
import type { BreakSlot, BusyBooking, WorkSlot } from "@/lib/slots";
import { supabase } from "@/lib/supabase";
import { createTashkentClock } from "@/lib/tashkent";
import type { TKey } from "@/locales/uz";

const clock = createTashkentClock();

// Flexible davomiylik qadami — web Review/Booking UI'dagi `step={5}` ga mos.
const FLEX_STEP = 5;
// Flexible davomiylik uchun mantiqiy yuqori chegara (flexible_min ning 8 baravari,
// lekin kamida 120 daq). Web cheksiz number-input ishlatadi; mobil stepper uchun
// foydalanuvchi-do'st chegara qo'yamiz.
function flexMax(min: number): number {
  return Math.max(120, min * 8);
}

interface Config {
  duration_type: "fixed" | "flexible";
  fixed_durations: number[];
  flexible_min: number;
  buffer_minutes: number;
}

export default function ProviderScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { slug, date: dateParam } = useLocalSearchParams<{ slug: string; date?: string }>();
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
  const [customDuration, setCustomDuration] = useState(0); // flexible uchun
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [booking, setBooking] = useState(false);

  // Sharhlardan jonli reyting
  const [live, setLive] = useState<{ avg: number; count: number } | null>(null);

  const today = clock.now().dateStr;

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    (async () => {
      try {
        const { data: prov } = await supabase
          .from("provider_search_view")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (!prov) return;
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
        if (cfg.duration_type === "flexible") {
          // Flexible: boshlang'ich tanlov = flexible_min (web bilan bir xil).
          const fmin = cfg.flexible_min || FLEX_STEP;
          setCustomDuration(fmin);
          setDuration(fmin);
        } else {
          const opts = cfg.fixed_durations?.length > 0 ? cfg.fixed_durations : [30];
          setDuration(opts[0]);
        }
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
          .neq("status", "cancelled")
          .gte("booking_date", today);
        setBookings((bk as BusyBooking[]) ?? []);
      }

        const dates = availableDates(slots, today);
        // Waitlist deep-link (?date=YYYY-MM-DD) — o'sha kun mavjud bo'lsa tanlaymiz.
        if (dates.length) {
          setDate(dateParam && dates.includes(dateParam) ? dateParam : dates[0]);
        }
      } catch {
        /* xato — finally loading'ni o'chiradi */
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const dates = useMemo(() => availableDates(workSlots, today), [workSlots, today]);

  const isFlexible = config?.duration_type === "flexible";

  // Fixed davomiyliklar (web: bo'sh bo'lsa [30]).
  const fixedDurations = useMemo(
    () =>
      config && config.fixed_durations?.length > 0 ? config.fixed_durations : [30],
    [config]
  );

  // Vaqt panjarasi qadami va nomzod davomiyliklar — web semantikasi:
  //   fixed    -> step = min(fixed_durations), nomzodlar = fixed_durations
  //   flexible -> step = flexible_min,         nomzodlar = [flexible_min]
  const minDur = useMemo(() => {
    if (!config) return 30;
    return isFlexible ? config.flexible_min || FLEX_STEP : Math.min(...fixedDurations);
  }, [config, isFlexible, fixedDurations]);

  // Fixed rejimda vaqtlarni TANLANGAN davomiylik bo'yicha filtrlaymiz — shunda
  // ko'rsatilgan har bir vaqt o'sha davomiylikka aniq sig'adi (web: vaqtdan keyin
  // mos davomiyliklar ko'rsatiladi; biz teskari tartibda, lekin natija bir xil to'g'ri).
  const candidateDurations = useMemo(
    () =>
      isFlexible
        ? [config?.flexible_min || FLEX_STEP]
        : [duration || Math.min(...fixedDurations)],
    [isFlexible, config, fixedDurations, duration]
  );

  // Fixed rejimda chip tanlovlari; flexible bo'lsa stepper ishlatamiz.
  const durationOptions = useMemo(
    () => (isFlexible ? [] : fixedDurations),
    [isFlexible, fixedDurations]
  );

  const times = useMemo(() => {
    if (!date || !config) return [];
    const now = clock.now();
    return freeStartTimes(
      date,
      minDur,
      candidateDurations,
      config.buffer_minutes ?? 0,
      workSlots,
      breaks,
      bookings,
      now.dateStr,
      now.hhmm
    );
  }, [date, config, minDur, candidateDurations, workSlots, breaks, bookings]);

  // Tanlangan vaqt + flexible davomiylik bu vaqtga sig'adimi?
  const flexFits = useMemo(() => {
    if (!isFlexible || !config || !time) return true;
    return isSlotFree(
      time,
      customDuration,
      config.buffer_minutes ?? 0,
      workSlots,
      breaks,
      bookings,
      date
    );
  }, [isFlexible, config, time, customDuration, workSlots, breaks, bookings, date]);

  const dayAvailability = useMemo(() => {
    if (!config) return [] as { date: string; isFull: boolean }[];
    const now = clock.now();
    return dates.map((d) => {
      const free =
        freeStartTimes(
          d,
          minDur,
          candidateDurations,
          config.buffer_minutes ?? 0,
          workSlots,
          breaks,
          bookings,
          now.dateStr,
          now.hhmm
        ).length > 0;
      return { date: d, isFull: !free };
    });
  }, [dates, config, minDur, candidateDurations, workSlots, breaks, bookings]);

  const fullDays = useMemo(() => dayAvailability.filter((x) => x.isFull).map((x) => x.date), [dayAvailability]);
  const freeDays = useMemo(
    () =>
      dayAvailability
        .filter((x) => !x.isFull)
        .map((x) => ({ date: x.date, label: x.date === today ? t("date.today") : x.date.slice(5) })),
    [dayAvailability, today, t]
  );

  // Booking uchun amaldagi davomiylik: flexible -> customDuration, fixed -> duration.
  const effectiveDuration = isFlexible ? customDuration : duration;

  const requestBook = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!time || !effectiveDuration || !provider) return;
    if (isFlexible && !flexFits) return;
    setConfirmOpen(true);
  };

  // Eng yangi band vaqtlarni serverdan olamiz (get_busy_slots service_role bilan
  // BARCHA bronlarni qaytaradi; oddiy bookings so'rovi RLS sababli faqat o'z
  // bronlaringizni ko'rsatadi). Web useProviderBooking bilan bir xil.
  const fetchFreshBusy = async (providerId: string, day: string): Promise<BusyBooking[]> => {
    const rpc = await supabase.rpc("get_busy_slots", { p_provider: providerId, p_from: day, p_to: day });
    if (!rpc.error && rpc.data) return rpc.data as BusyBooking[];
    const { data } = await supabase
      .from("bookings")
      .select("booking_date,start_time,end_time")
      .eq("provider_id", providerId)
      .neq("status", "cancelled")
      .eq("booking_date", day);
    return (data as BusyBooking[]) ?? [];
  };

  const confirmBook = async () => {
    if (!time || !effectiveDuration || !provider || !user || !config) return;

    // O'tib ketgan vaqtni rad etamiz (Toshkent vaqti bo'yicha).
    const now = clock.now();
    const notPast = date !== now.dateStr || timeToMin(time) > timeToMin(now.hhmm);
    if (!notPast) {
      setConfirmOpen(false);
      setTime("");
      Alert.alert(t("booking.conflict"), t("booking.past_time_desc"), [{ text: t("booking.ok") }]);
      return;
    }

    setBooking(true);
    const endTime = addMinutes(time, effectiveDuration);
    const buffer = config.buffer_minutes ?? 0;

    try {
      // 1) Konkurensiya himoyasi: insert oldidan slot hali bo'shligini qayta tekshiramiz.
      const fresh = await fetchFreshBusy(provider.id, date);
      const stillFree = isSlotFree(time, effectiveDuration, buffer, workSlots, breaks, fresh, date);
      if (!stillFree) {
        // UI ni yangi ma'lumot bilan yangilab, do'stona konflikt xabarini ko'rsatamiz.
        setBookings((prev) => [...prev.filter((b) => b.booking_date !== date), ...fresh]);
        setConfirmOpen(false);
        setTime("");
        setBooking(false);
        Alert.alert(t("booking.conflict"), t("booking.just_taken_desc"), [{ text: t("booking.ok") }]);
        return;
      }

      // 2) Bron.
      const { error } = await supabase.from("bookings").insert({
        client_id: user.id,
        provider_id: provider.id,
        booking_date: date,
        start_time: time,
        end_time: endTime,
        duration_minutes: effectiveDuration,
        status: "upcoming",
        notes: note.trim() || null,
      });

      if (error) {
        // DB unique-index (23505) yoki boshqa xato — o'sha lahzada band qilingan.
        setBookings((prev) => [...prev, { booking_date: date, start_time: time, end_time: endTime }]);
        setConfirmOpen(false);
        setTime("");
        setBooking(false);
        Alert.alert(t("booking.conflict"), t("booking.just_taken_desc"), [{ text: t("booking.ok") }]);
        return;
      }

      // 3) Navbatni 'converted' qilish — web useProviderBooking bilan AYNAN bir xil:
      //    aniq-kun (desired_date === date) YOKI flexible (oraliq ichida).
      try {
        const { data: wl } = await supabase
          .from("waitlist")
          .select("id, desired_date, date_to, flexible")
          .eq("provider_id", provider.id)
          .eq("client_id", user.id)
          .in("status", ["waiting", "notified"]);
        const coverIds = (wl ?? [])
          .filter((e: { desired_date: string; date_to: string | null; flexible: boolean }) =>
            e.flexible
              ? date >= e.desired_date && date <= (e.date_to || e.desired_date)
              : e.desired_date === date
          )
          .map((e: { id: string }) => e.id);
        if (coverIds.length) {
          await supabase.from("waitlist").update({ status: "converted" }).in("id", coverIds);
        }
      } catch {
        /* navbat o'tkazilmadi — bron baribir muvaffaqiyatli */
      }

      setBookings((prev) => [...prev, { booking_date: date, start_time: time, end_time: endTime }]);
      setConfirmOpen(false);
      setTime("");
      setNote("");
      setBooking(false);
      Alert.alert(t("booking.success"), t("booking.success_desc"), [
        { text: t("booking.ok"), onPress: () => router.push("/bookings") },
      ]);
    } catch {
      setBooking(false);
      setConfirmOpen(false);
      Alert.alert(t("booking.conflict"), t("booking.just_taken_desc"), [{ text: t("booking.ok") }]);
    }
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
                      label={formatDuration(d, t)}
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
                    onPress={() => {
                      setTime(tm);
                      if (isFlexible && config) setCustomDuration(config.flexible_min || FLEX_STEP);
                    }}
                  >
                    <Text style={[styles.timeText, time === tm && styles.timeTextActive]}>{tm}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Flexible davomiylik — vaqt tanlangach ko'rsatiladi (web: 3-qadam) */}
            {times.length > 0 && isFlexible && !!time && config && (
              <DurationStepper
                value={customDuration}
                min={config.flexible_min || FLEX_STEP}
                max={flexMax(config.flexible_min || FLEX_STEP)}
                step={FLEX_STEP}
                onChange={setCustomDuration}
                formatDuration={(m) => formatDuration(m, t)}
                minLabel={t("booking.minutes_min", { m: config.flexible_min || FLEX_STEP })}
                title={t("booking.duration")}
                tooLong={!flexFits}
                tooLongLabel={t("booking.duration_too_long")}
              />
            )}

            {times.length > 0 && (
              <View style={styles.bookBtn}>
                <Button
                  label={isAuthenticated ? t("common.book_now") : t("booking.login_and_book")}
                  onPress={requestBook}
                  disabled={!time || !effectiveDuration || (isFlexible && !flexFits)}
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
          <ConfirmRow
            icon="time-outline"
            label={t("booking.time_label")}
            value={`${time} · ${formatDuration(effectiveDuration, t)}`}
          />
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

type TFn = (key: TKey, vars?: Record<string, string | number>) => string;

// Davomiylikni tilga moslab ko'rsatadi (web ProviderBookingUI.formatDuration bilan bir xil).
function formatDuration(min: number, t: TFn): string {
  if (min < 60) return `${min} ${t("unit.min")}`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0
    ? `${h}${t("unit.hour_short")} ${m}${t("unit.min_short")}`
    : `${h} ${t("unit.hour")}`;
}

// Flexible davomiylik uchun stepper (− [qiymat] +). Web cheksiz number-input
// o'rniga mobil-do'st tugmalar; min/max/step web semantikasini saqlaydi.
function DurationStepper({
  value,
  min,
  max,
  step,
  onChange,
  formatDuration: fmt,
  minLabel,
  title,
  tooLong,
  tooLongLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatDuration: (m: number) => string;
  minLabel: string;
  title: string;
  tooLong?: boolean;
  tooLongLabel?: string;
}) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <View style={styles.stepperWrap}>
      <Text variant="bodyStrong" style={styles.label}>
        {title}
      </Text>
      <View style={styles.stepperRow}>
        <Pressable
          style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
          onPress={dec}
          disabled={value <= min}
          hitSlop={8}
        >
          <Ionicons name="remove" size={22} color={value <= min ? Colors.textMuted : Colors.primaryDark} />
        </Pressable>
        <View style={styles.stepValue}>
          <Text variant="title">{fmt(value)}</Text>
        </View>
        <Pressable
          style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
          onPress={inc}
          disabled={value >= max}
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color={value >= max ? Colors.textMuted : Colors.primaryDark} />
        </Pressable>
      </View>
      {tooLong ? (
        <Text variant="caption" color={Colors.danger} style={styles.stepHint}>
          {tooLongLabel}
        </Text>
      ) : (
        <Text variant="caption" muted style={styles.stepHint}>
          {minLabel}
        </Text>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
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
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
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
    minWidth: 74,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: Colors.cardElevated,
  },
  timeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary, ...shadow.sm },
  timeText: { color: Colors.text, fontWeight: "600" },
  timeTextActive: { color: Colors.primaryForeground },
  stepperWrap: { marginTop: spacing.xs },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepValue: { flex: 1, alignItems: "center", justifyContent: "center" },
  stepHint: { marginTop: spacing.xs },
  bookBtn: { marginTop: spacing.lg },
  confirmRows: { gap: spacing.sm, marginBottom: spacing.md },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  confirmLabel: { width: 70 },
  confirmValue: { flex: 1, textAlign: "right" },
  confirmBtn: { marginTop: spacing.lg },
});
