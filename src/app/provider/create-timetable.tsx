import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Chip, IconButton, Input, Text, TimeField } from "@/components/ui";
import { Colors, type ColorPalette } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useMyProvider } from "@/hooks/useMyProvider";
import { localize } from "@/lib/localize";
import { supabase } from "@/lib/supabase";
import { addDaysStr, createTashkentClock, weekdayKeyOf } from "@/lib/tashkent";

const clock = createTashkentClock();

const WEEKDAYS = [
  { key: "Monday", uz: "Dushanba", ru: "Понедельник" },
  { key: "Tuesday", uz: "Seshanba", ru: "Вторник" },
  { key: "Wednesday", uz: "Chorshanba", ru: "Среда" },
  { key: "Thursday", uz: "Payshanba", ru: "Четверг" },
  { key: "Friday", uz: "Juma", ru: "Пятница" },
  { key: "Saturday", uz: "Shanba", ru: "Суббота" },
  { key: "Sunday", uz: "Yakshanba", ru: "Воскресенье" },
] as const;

const BUFFER_PRESETS = [0, 5, 10, 15, 30];

interface TimeSlot {
  id: string;
  start: string;
  end: string;
}
interface BreakSlot {
  id: string;
  start: string;
  end: string;
  label: string;
}
interface DayPattern {
  enabled: boolean;
  slots: TimeSlot[];
  breaks: BreakSlot[];
}

let counter = 0;
const uid = () => `r${++counter}`;

function timeToMin(t: string): number {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function defaultDay(enabled: boolean): DayPattern {
  return {
    enabled,
    slots: enabled ? [{ id: uid(), start: "09:00", end: "18:00" }] : [],
    breaks: [],
  };
}

export default function CreateTimetableScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { provider, loading } = useMyProvider();

  const [tab, setTab] = useState<"dates" | "settings">("dates");

  const [durationType, setDurationType] = useState<"fixed" | "flexible">("fixed");
  const [durations, setDurations] = useState<number[]>([30, 60]);
  const [newDur, setNewDur] = useState("");
  const [flexibleMin, setFlexibleMin] = useState("30");
  const [buffer, setBuffer] = useState("0");
  const [scheduleDays, setScheduleDays] = useState("30");

  const [week, setWeek] = useState<Record<string, DayPattern>>(() => {
    const init: Record<string, DayPattern> = {};
    WEEKDAYS.forEach((d, i) => (init[d.key] = defaultDay(i < 5)));
    return init;
  });

  const [saving, setSaving] = useState(false);

  // Mavjud config + haftalik shablonni yuklash
  useEffect(() => {
    if (!provider) return;
    let cancelled = false;
    (async () => {
      // Config
      const { data: cfg } = await supabase
        .from("timetable_config")
        .select("*")
        .eq("provider_id", provider.id)
        .maybeSingle();
      if (!cancelled && cfg) {
        if (cfg.duration_type) setDurationType(cfg.duration_type);
        if (Array.isArray(cfg.fixed_durations) && cfg.fixed_durations.length) setDurations(cfg.fixed_durations);
        if (cfg.flexible_min != null) setFlexibleMin(String(cfg.flexible_min));
        if (cfg.buffer_minutes != null) setBuffer(String(cfg.buffer_minutes));
        if (cfg.schedule_days != null) setScheduleDays(String(cfg.schedule_days));
      }

      // Kelajakdagi slot/break'lardan haftalik shablonni tiklash.
      // Har bir hafta kuni uchun BIRINCHI uchragan sanani namuna sifatida olamiz.
      const today = clock.now().dateStr;
      const [{ data: slotsData }, { data: breaksData }] = await Promise.all([
        supabase.from("timetable_slots").select("*").eq("provider_id", provider.id).gte("slot_date", today),
        supabase.from("timetable_breaks").select("*").eq("provider_id", provider.id).gte("slot_date", today),
      ]);
      if (cancelled || (!slotsData?.length && !breaksData?.length)) return;

      // sana -> {slots, breaks}
      const byDate: Record<string, { slots: any[]; breaks: any[] }> = {};
      (slotsData || []).forEach((s) => {
        (byDate[s.slot_date] ||= { slots: [], breaks: [] }).slots.push(s);
      });
      (breaksData || []).forEach((b) => {
        (byDate[b.slot_date] ||= { slots: [], breaks: [] }).breaks.push(b);
      });

      // Har bir weekday uchun eng erta sanani topib, shablonni yasaymiz
      const next: Record<string, DayPattern> = {};
      WEEKDAYS.forEach((d) => (next[d.key] = { enabled: false, slots: [], breaks: [] }));
      const seen = new Set<string>();
      Object.keys(byDate)
        .sort()
        .forEach((date) => {
          const wd = weekdayKeyOf(date);
          if (seen.has(wd) || !next[wd]) return;
          seen.add(wd);
          const entry = byDate[date];
          next[wd] = {
            enabled: true,
            slots: entry.slots
              .sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time))
              .map((s) => ({ id: uid(), start: s.start_time, end: s.end_time })),
            breaks: entry.breaks
              .sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time))
              .map((b) => ({ id: uid(), start: b.start_time, end: b.end_time, label: localize(b.label) || "" })),
          };
        });
      if (!cancelled) setWeek(next);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [provider]);

  const setDay = (key: string, updater: (d: DayPattern) => DayPattern) =>
    setWeek((p) => ({ ...p, [key]: updater(p[key]) }));

  const toggleDay = (key: string, enabled: boolean) =>
    setDay(key, (d) => ({
      ...d,
      enabled,
      slots: enabled && d.slots.length === 0 ? [{ id: uid(), start: "09:00", end: "18:00" }] : d.slots,
    }));

  const addSlot = (key: string) =>
    setDay(key, (d) => ({ ...d, slots: [...d.slots, { id: uid(), start: "09:00", end: "18:00" }] }));
  const removeSlot = (key: string, id: string) =>
    setDay(key, (d) => ({ ...d, slots: d.slots.filter((s) => s.id !== id) }));
  const updateSlot = (key: string, id: string, field: "start" | "end", value: string) =>
    setDay(key, (d) => ({ ...d, slots: d.slots.map((s) => (s.id === id ? { ...s, [field]: value } : s)) }));

  const addBreak = (key: string) =>
    setDay(key, (d) => ({
      ...d,
      breaks: [...d.breaks, { id: uid(), start: "13:00", end: "14:00", label: t("tt.lunch") }],
    }));
  const removeBreak = (key: string, id: string) =>
    setDay(key, (d) => ({ ...d, breaks: d.breaks.filter((b) => b.id !== id) }));
  const updateBreak = (key: string, id: string, field: "start" | "end" | "label", value: string) =>
    setDay(key, (d) => ({ ...d, breaks: d.breaks.map((b) => (b.id === id ? { ...b, [field]: value } : b)) }));

  const addDuration = () => {
    const n = parseInt(newDur, 10);
    if (Number.isNaN(n) || n < 10) {
      Alert.alert(t("tt.err_min10"));
      return;
    }
    if (n > 1440) {
      Alert.alert(t("tt.err_max"));
      return;
    }
    if (durations.includes(n)) {
      Alert.alert(t("tt.err_dup"));
      return;
    }
    setDurations((p) => [...p, n].sort((a, b) => a - b));
    setNewDur("");
  };

  // Haftalik shablonni validatsiya. Xatolik bo'lsa matn qaytaradi, aks holda null.
  const validate = (): string | null => {
    for (const d of WEEKDAYS) {
      const p = week[d.key];
      if (!p.enabled) continue;
      const dayLabel = lang === "ru" ? d.ru : d.uz;

      if (p.slots.length === 0) {
        return t("tt.val_no_time", { date: dayLabel });
      }
      // Har bir slot: tugash > boshlanish
      for (let i = 0; i < p.slots.length; i++) {
        if (timeToMin(p.slots[i].start) >= timeToMin(p.slots[i].end)) {
          return t("tt.val_end_after", { date: dayLabel, n: i + 1 });
        }
      }
      // Slotlar ustma-ust tushmasligi kerak
      const sorted = [...p.slots].sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
      for (let i = 1; i < sorted.length; i++) {
        if (timeToMin(sorted[i].start) < timeToMin(sorted[i - 1].end)) {
          return t("tt.val_overlap", { date: dayLabel });
        }
      }
      // Tanaffuslar: tugash > boshlanish
      for (const b of p.breaks) {
        if (timeToMin(b.start) >= timeToMin(b.end)) {
          return t("tt.val_break_end", { date: dayLabel });
        }
      }
    }
    if (durationType === "fixed" && durations.length === 0) {
      return t("tt.val_duration");
    }
    return null;
  };

  const onSave = async () => {
    if (!provider) return;
    const days = Math.max(1, Math.min(120, parseInt(scheduleDays, 10) || 30));

    const problem = validate();
    if (problem) {
      Alert.alert(problem);
      return;
    }

    setSaving(true);
    const today = clock.now().dateStr;

    const configPayload = {
      duration_type: durationType,
      fixed_durations: durationType === "fixed" ? durations : [],
      flexible_min: parseInt(flexibleMin, 10) || 30,
      buffer_minutes: parseInt(buffer, 10) || 0,
      schedule_days: days,
    };

    try {
      // Config upsert
      const { data: existing } = await supabase
        .from("timetable_config")
        .select("id")
        .eq("provider_id", provider.id)
        .maybeSingle();
      if (existing) {
        await supabase.from("timetable_config").update(configPayload).eq("provider_id", provider.id);
      } else {
        await supabase.from("timetable_config").insert({ provider_id: provider.id, ...configPayload });
      }

      // Eski (kelajak + sanasi null legacy) slot/break'larni o'chirish (web bilan bir xil)
      await supabase
        .from("timetable_slots")
        .delete()
        .eq("provider_id", provider.id)
        .or(`slot_date.gte.${today},slot_date.is.null`);
      await supabase
        .from("timetable_breaks")
        .delete()
        .eq("provider_id", provider.id)
        .or(`slot_date.gte.${today},slot_date.is.null`);

      // Haftalik shablonni sanalarga yoyish (har kunda KO'P slot va KO'P tanaffus)
      const slots: any[] = [];
      const breaks: any[] = [];
      for (let i = 0; i < days; i++) {
        const date = addDaysStr(today, i);
        const wd = weekdayKeyOf(date);
        const p = week[wd];
        if (!p?.enabled) continue;
        p.slots.forEach((s) => {
          slots.push({
            provider_id: provider.id,
            slot_date: date,
            day_of_week: wd,
            start_time: s.start,
            end_time: s.end,
            is_available: true,
          });
        });
        p.breaks.forEach((b) => {
          if (timeToMin(b.start) < timeToMin(b.end)) {
            breaks.push({
              provider_id: provider.id,
              slot_date: date,
              day_of_week: wd,
              start_time: b.start,
              end_time: b.end,
              label: b.label || t("tt.lunch"),
            });
          }
        });
      }

      if (slots.length) await supabase.from("timetable_slots").insert(slots);
      if (breaks.length) await supabase.from("timetable_breaks").insert(breaks);

      setSaving(false);
      Alert.alert(t("tt.toast_saved"), undefined, [{ text: t("booking.ok"), onPress: () => router.back() }]);
    } catch (e: any) {
      setSaving(false);
      Alert.alert(t("tt.err_save"), e?.message);
    }
  };

  // ── Hisoblangan statistikalar (sarlavha kartalari uchun) ──
  const stats = useMemo(() => {
    let markedDays = 0;
    let timeBlocks = 0;
    WEEKDAYS.forEach((d) => {
      const p = week[d.key];
      if (p?.enabled) {
        markedDays += 1;
        timeBlocks += p.slots.length;
      }
    });
    return { markedDays, timeBlocks };
  }, [week]);

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
          <Text variant="subtitle" muted center>
            {t("tt.no_business_desc")}
          </Text>
          <View style={styles.cta}>
            <Button label={t("tt.create_business")} onPress={() => router.push("/provider/add-business")} fullWidth={false} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Sarlavha qatori: orqaga, sarlavha + tagsarlavha, Saqlash */}
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <View style={styles.flex}>
          <Text variant="subtitle">{t("tt.title")}</Text>
          <Text variant="caption" muted>
            {t("tt.header_caption")}
          </Text>
        </View>
        <Button label={t("common.save")} onPress={onSave} loading={saving} size="sm" fullWidth={false} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {/* Statistik kartalar */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.primarySoft }]}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            </View>
            <Text variant="caption" muted center style={styles.statLabel}>
              {t("tt.stat_marked").toUpperCase()}
            </Text>
            <Text variant="title">
              {stats.markedDays} {t("tt.unit_days")}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.dangerSoft }]}>
              <Ionicons name="time-outline" size={20} color={Colors.text} />
            </View>
            <Text variant="caption" muted center style={styles.statLabel}>
              {t("tt.stat_slots").toUpperCase()}
            </Text>
            <Text variant="title">{stats.timeBlocks}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.primaryTint }]}>
              <Ionicons name="timer-outline" size={20} color={Colors.info} />
            </View>
            <Text variant="caption" muted center style={styles.statLabel}>
              {t("tt.stat_buffer").toUpperCase()}
            </Text>
            <Text variant="title">
              {parseInt(buffer, 10) || 0} {t("common.min")}
            </Text>
          </View>
        </View>

        {/* Segmentli tab: Sanalar / Sozlamalar */}
        <View style={styles.segment}>
          <Pressable
            style={[styles.segmentItem, tab === "dates" && styles.segmentItemActive]}
            onPress={() => setTab("dates")}
          >
            <Text variant="bodyStrong" color={tab === "dates" ? Colors.text : Colors.textMuted}>
              {t("tt.tab_schedule")}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentItem, tab === "settings" && styles.segmentItemActive]}
            onPress={() => setTab("settings")}
          >
            <Text variant="bodyStrong" color={tab === "settings" ? Colors.text : Colors.textMuted}>
              {t("tt.tab_settings")}
            </Text>
          </Pressable>
        </View>

        {tab === "dates" ? (
          <>
            <Text variant="caption" muted style={styles.weekLabel}>
              {t("tt.this_week").toUpperCase()}
            </Text>

            {WEEKDAYS.map((d) => {
              const p = week[d.key];
              return (
                <View key={d.key} style={[styles.dayCard, !p.enabled && styles.dayCardOff]}>
                  {/* Kun sarlavhasi + holat + toggle */}
                  <View style={styles.dayHead}>
                    <View style={[styles.dayBadge, p.enabled && styles.dayBadgeOn]}>
                      <Text variant="caption" color={p.enabled ? Colors.primaryDarker : Colors.textSubtle}>
                        {(lang === "ru" ? d.ru : d.uz).slice(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.flex}>
                      <Text variant="bodyStrong" color={p.enabled ? Colors.text : Colors.textSubtle}>
                        {lang === "ru" ? d.ru : d.uz}
                      </Text>
                      {p.enabled ? (
                        <View style={styles.statusRow}>
                          <View style={styles.statusDot} />
                          <Text variant="caption" color={Colors.primary}>
                            {t("tt.active")}
                          </Text>
                        </View>
                      ) : (
                        <Text variant="caption" muted>
                          {t("tt.not_visible")}
                        </Text>
                      )}
                    </View>
                    <Switch
                      value={p.enabled}
                      onValueChange={(v) => toggleDay(d.key, v)}
                      trackColor={{ true: Colors.primary, false: Colors.border }}
                      thumbColor={Colors.white}
                    />
                  </View>

                  {p.enabled && (
                    <View style={styles.dayBody}>
                      {/* Ish vaqtlari (ko'p) */}
                      {p.slots.map((slot) => {
                        const invalid = timeToMin(slot.start) >= timeToMin(slot.end);
                        return (
                          <View key={slot.id} style={[styles.slotRow, invalid && styles.invalidRow]}>
                            <View style={styles.slotIcon}>
                              <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
                            </View>
                            <View style={styles.slotTimes}>
                              <View style={styles.timeGroup}>
                                <Text variant="caption" muted>
                                  {t("tt.start")}
                                </Text>
                                <TimeField value={slot.start} onChange={(v) => updateSlot(d.key, slot.id, "start", v)} />
                              </View>
                              <View style={styles.timeGroup}>
                                <Text variant="caption" muted>
                                  {t("tt.end")}
                                </Text>
                                <TimeField value={slot.end} onChange={(v) => updateSlot(d.key, slot.id, "end", v)} />
                              </View>
                            </View>
                            {p.slots.length > 1 && (
                              <Pressable style={styles.delBtn} onPress={() => removeSlot(d.key, slot.id)} hitSlop={8}>
                                <Ionicons name="trash-outline" size={18} color={Colors.textSubtle} />
                              </Pressable>
                            )}
                          </View>
                        );
                      })}

                      {/* Tanaffuslar (ko'p, nomli) — divider uslubida */}
                      {p.breaks.map((br) => {
                        const invalid = timeToMin(br.start) >= timeToMin(br.end);
                        return (
                          <View key={br.id} style={styles.breakWrap}>
                            <View style={styles.breakLabelRow}>
                              <View style={styles.breakLine} />
                              <Ionicons name="cafe-outline" size={14} color={Colors.textMuted} />
                              <Text variant="caption" muted>
                                {br.label || t("tt.lunch")} ({br.start} — {br.end})
                              </Text>
                              <View style={styles.breakLine} />
                              <Pressable onPress={() => removeBreak(d.key, br.id)} hitSlop={8}>
                                <Ionicons name="close" size={16} color={Colors.textSubtle} />
                              </Pressable>
                            </View>
                            <View style={[styles.breakCard, invalid && styles.invalidRow]}>
                              <View style={styles.flex}>
                                <Input
                                  value={br.label}
                                  placeholder={t("tt.lunch")}
                                  onChangeText={(v) => updateBreak(d.key, br.id, "label", v)}
                                />
                              </View>
                              <View style={styles.timeRow}>
                                <TimeField value={br.start} onChange={(v) => updateBreak(d.key, br.id, "start", v)} />
                                <Text variant="caption" muted>
                                  –
                                </Text>
                                <TimeField value={br.end} onChange={(v) => updateBreak(d.key, br.id, "end", v)} />
                              </View>
                            </View>
                          </View>
                        );
                      })}

                      <View style={styles.dayActions}>
                        <Pressable style={styles.addDashed} onPress={() => addSlot(d.key)}>
                          <Ionicons name="add" size={16} color={Colors.primary} />
                          <Text variant="caption" color={Colors.primary}>
                            {t("tt.add_time")}
                          </Text>
                        </Pressable>
                        <Pressable style={[styles.addDashed, styles.addBreakDashed]} onPress={() => addBreak(d.key)}>
                          <Ionicons name="cafe-outline" size={16} color={Colors.textMuted} />
                          <Text variant="caption" muted>
                            {t("tt.add_break")}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.settingsWrap}>
            {/* Davomiylik turi */}
            <Text variant="title" style={styles.settingsTitle}>
              {t("tt.duration_title")}
            </Text>
            <Text variant="caption" muted style={styles.settingsHint}>
              {t("tt.duration_desc")}
            </Text>
            <View style={styles.row}>
              <Chip label={t("tt.fixed")} active={durationType === "fixed"} onPress={() => setDurationType("fixed")} />
              <Chip
                label={t("tt.flexible")}
                active={durationType === "flexible"}
                onPress={() => setDurationType("flexible")}
              />
            </View>

            {durationType === "fixed" ? (
              <View style={styles.card}>
                <Text variant="bodyStrong">{t("tt.your_durations")}</Text>
                <View style={styles.durWrap}>
                  {durations.map((d) => (
                    <Pressable
                      key={d}
                      style={styles.durChip}
                      onPress={() => setDurations((p) => p.filter((x) => x !== d))}
                    >
                      <Text variant="caption" color={Colors.primaryDarker}>
                        {d} {t("common.min")}
                      </Text>
                      <Ionicons name="close-circle" size={15} color={Colors.primaryDark} />
                    </Pressable>
                  ))}
                </View>
                <View style={styles.addRow}>
                  <View style={styles.flex}>
                    <Input
                      placeholder={t("tt.example_45")}
                      value={newDur}
                      onChangeText={setNewDur}
                      keyboardType="number-pad"
                    />
                  </View>
                  <Button label={t("tt.add")} onPress={addDuration} fullWidth={false} size="md" />
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <Input
                  label={t("tt.min_duration")}
                  value={flexibleMin}
                  onChangeText={setFlexibleMin}
                  keyboardType="number-pad"
                />
              </View>
            )}

            {/* Oraliq vaqt — preset chip'lar */}
            <Text variant="title" style={styles.settingsTitle}>
              {t("tt.buffer_title")}
            </Text>
            <Text variant="caption" muted style={styles.settingsHint}>
              {t("tt.buffer_desc")}
            </Text>
            <View style={styles.row}>
              {BUFFER_PRESETS.map((b) => (
                <Chip
                  key={b}
                  label={b === 0 ? t("tt.buffer_none") : `${b} ${t("common.min")}`}
                  active={(parseInt(buffer, 10) || 0) === b}
                  onPress={() => setBuffer(String(b))}
                />
              ))}
            </View>
            <View style={styles.card}>
              <Input
                label={t("tt.buffer_title")}
                value={buffer}
                onChangeText={setBuffer}
                keyboardType="number-pad"
              />
            </View>

            {/* Belgilangan kunlar oralig'i */}
            <Text variant="title" style={styles.settingsTitle}>
              {t("tt.stat_days")}
            </Text>
            <View style={styles.card}>
              <Input
                label={t("tt.stat_days")}
                value={scheduleDays}
                onChangeText={setScheduleDays}
                keyboardType="number-pad"
              />
            </View>
          </View>
        )}

        <View style={styles.cta}>
          <Button label={t("common.save")} onPress={onSave} loading={saving} size="lg" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ColorPalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
    flexCenter: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
    flex: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    body: { padding: spacing.lg, paddingBottom: spacing.huge },

    // Statistik kartalar
    statsRow: { flexDirection: "row", gap: spacing.sm },
    statCard: {
      flex: 1,
      backgroundColor: Colors.cardElevated,
      borderRadius: radius.xl,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
      alignItems: "center",
      gap: spacing.xs,
      ...shadow.sm,
    },
    statIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.xs,
    },
    statLabel: { letterSpacing: 0.5 },

    // Segmentli tab
    segment: {
      flexDirection: "row",
      backgroundColor: Colors.backgroundAlt,
      borderRadius: radius.pill,
      padding: spacing.xs,
      marginTop: spacing.xl,
    },
    segmentItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
    },
    segmentItemActive: {
      backgroundColor: Colors.cardElevated,
      ...shadow.sm,
    },

    weekLabel: { marginTop: spacing.xl, marginBottom: spacing.md, letterSpacing: 0.5 },

    // Kun kartalari
    dayCard: {
      backgroundColor: Colors.cardElevated,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: spacing.lg,
      marginBottom: spacing.md,
      ...shadow.sm,
    },
    dayCardOff: { backgroundColor: Colors.backgroundAlt, ...shadow.none },
    dayHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    dayBadge: {
      width: 46,
      height: 46,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.backgroundAlt,
    },
    dayBadgeOn: { backgroundColor: Colors.primarySoft },
    statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },

    dayBody: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
      gap: spacing.md,
    },

    // Ish vaqti satri
    slotRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: Colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: spacing.md,
    },
    slotIcon: { alignItems: "center", justifyContent: "center" },
    slotTimes: { flex: 1, flexDirection: "row", gap: spacing.lg, flexWrap: "wrap" },
    invalidRow: { borderColor: Colors.danger },
    timeGroup: { gap: 2, alignItems: "flex-start" },
    timeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
    delBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
    },

    // Tanaffus — divider uslubida
    breakWrap: { gap: spacing.sm },
    breakLabelRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    breakLine: { flex: 1, height: 1, borderRadius: 1, borderTopWidth: 1, borderColor: Colors.border, borderStyle: "dashed" },
    breakCard: {
      backgroundColor: Colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },

    dayActions: { gap: spacing.sm },
    addDashed: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: Colors.primary,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
    },
    addBreakDashed: { borderColor: Colors.border },

    // Sozlamalar tab
    settingsWrap: { gap: spacing.sm },
    settingsTitle: { marginTop: spacing.xl },
    settingsHint: { marginBottom: spacing.xs },
    row: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
    card: {
      backgroundColor: Colors.cardElevated,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: spacing.lg,
      gap: spacing.md,
      marginTop: spacing.md,
      ...shadow.sm,
    },
    durWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    durChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: Colors.primarySoft,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    addRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },

    cta: { marginTop: spacing.xl },
  });
