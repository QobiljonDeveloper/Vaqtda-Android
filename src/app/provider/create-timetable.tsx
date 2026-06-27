import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Chip, IconButton, Input, Text, TimeField } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import { useMyProvider } from "@/hooks/useMyProvider";
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

interface DayPattern {
  enabled: boolean;
  start: string;
  end: string;
  breakEnabled: boolean;
  breakStart: string;
  breakEnd: string;
}

function defaultDay(enabled: boolean): DayPattern {
  return { enabled, start: "09:00", end: "18:00", breakEnabled: false, breakStart: "13:00", breakEnd: "14:00" };
}

export default function CreateTimetableScreen() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { provider, loading } = useMyProvider();

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

  // Mavjud config'ni yuklash
  useEffect(() => {
    if (!provider) return;
    supabase
      .from("timetable_config")
      .select("*")
      .eq("provider_id", provider.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.duration_type) setDurationType(data.duration_type);
        if (Array.isArray(data.fixed_durations) && data.fixed_durations.length) setDurations(data.fixed_durations);
        if (data.flexible_min != null) setFlexibleMin(String(data.flexible_min));
        if (data.buffer_minutes != null) setBuffer(String(data.buffer_minutes));
        if (data.schedule_days != null) setScheduleDays(String(data.schedule_days));
      });
  }, [provider]);

  const setDay = (key: string, patch: Partial<DayPattern>) =>
    setWeek((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  const addDuration = () => {
    const n = parseInt(newDur, 10);
    if (Number.isNaN(n) || n < 10) {
      Alert.alert(t("tt.err_min10"));
      return;
    }
    if (durations.includes(n)) {
      Alert.alert(t("tt.err_dup"));
      return;
    }
    setDurations((p) => [...p, n].sort((a, b) => a - b));
    setNewDur("");
  };

  const onSave = async () => {
    if (!provider) return;
    const days = Math.max(1, Math.min(120, parseInt(scheduleDays, 10) || 30));
    if (durationType === "fixed" && durations.length === 0) {
      Alert.alert(t("tt.val_duration"));
      return;
    }
    // Kunlarni validatsiya
    for (const d of WEEKDAYS) {
      const p = week[d.key];
      if (p.enabled && p.start >= p.end) {
        Alert.alert(t("tt.val_end_after", { date: lang === "ru" ? d.ru : d.uz, n: 1 }));
        return;
      }
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

      // Eski (kelajak) slot/break'larni o'chirish
      await supabase.from("timetable_slots").delete().eq("provider_id", provider.id).gte("slot_date", today);
      await supabase.from("timetable_breaks").delete().eq("provider_id", provider.id).gte("slot_date", today);

      // Haftalik shablonni sanalarga yoyish
      const slots: any[] = [];
      const breaks: any[] = [];
      for (let i = 0; i < days; i++) {
        const date = addDaysStr(today, i);
        const wd = weekdayKeyOf(date);
        const p = week[wd];
        if (!p?.enabled) continue;
        slots.push({
          provider_id: provider.id,
          slot_date: date,
          day_of_week: wd,
          start_time: p.start,
          end_time: p.end,
          is_available: true,
        });
        if (p.breakEnabled && p.breakStart < p.breakEnd) {
          breaks.push({
            provider_id: provider.id,
            slot_date: date,
            day_of_week: wd,
            start_time: p.breakStart,
            end_time: p.breakEnd,
            label: "Tanaffus",
          });
        }
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
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text variant="subtitle">{t("tt.title")}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="body" muted>
          {t("tt.subtitle")}
        </Text>

        {/* Davomiylik */}
        <Text variant="title" style={styles.sectionTitle}>
          {t("tt.duration_title")}
        </Text>
        <View style={styles.row}>
          <Chip label={t("tt.fixed")} active={durationType === "fixed"} onPress={() => setDurationType("fixed")} />
          <Chip label={t("tt.flexible")} active={durationType === "flexible"} onPress={() => setDurationType("flexible")} />
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
                <Input placeholder={t("tt.example_45")} value={newDur} onChangeText={setNewDur} keyboardType="number-pad" />
              </View>
              <Button label={t("tt.add")} onPress={addDuration} fullWidth={false} size="md" />
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Input label={t("tt.min_duration")} value={flexibleMin} onChangeText={setFlexibleMin} keyboardType="number-pad" />
          </View>
        )}

        <View style={styles.twoCol}>
          <View style={styles.flex}>
            <Input label={t("tt.buffer_title")} value={buffer} onChangeText={setBuffer} keyboardType="number-pad" />
          </View>
          <View style={styles.flex}>
            <Input label={t("tt.stat_days")} value={scheduleDays} onChangeText={setScheduleDays} keyboardType="number-pad" />
          </View>
        </View>

        {/* Haftalik jadval */}
        <Text variant="title" style={styles.sectionTitle}>
          {t("tt.work_time")}
        </Text>
        {WEEKDAYS.map((d) => {
          const p = week[d.key];
          return (
            <View key={d.key} style={styles.dayCard}>
              <View style={styles.dayHead}>
                <Text variant="bodyStrong">{lang === "ru" ? d.ru : d.uz}</Text>
                <Switch
                  value={p.enabled}
                  onValueChange={(v) => setDay(d.key, { enabled: v })}
                  trackColor={{ true: Colors.primary, false: Colors.border }}
                  thumbColor={Colors.white}
                />
              </View>
              {p.enabled && (
                <>
                  <View style={styles.timeRow}>
                    <Text variant="caption" muted>
                      {t("tt.start")}
                    </Text>
                    <TimeField value={p.start} onChange={(v) => setDay(d.key, { start: v })} />
                    <Text variant="caption" muted>
                      {t("tt.end")}
                    </Text>
                    <TimeField value={p.end} onChange={(v) => setDay(d.key, { end: v })} />
                  </View>
                  <View style={styles.breakRow}>
                    <Text variant="caption" muted style={styles.flex}>
                      {t("tt.breaks")}
                    </Text>
                    <Switch
                      value={p.breakEnabled}
                      onValueChange={(v) => setDay(d.key, { breakEnabled: v })}
                      trackColor={{ true: Colors.primary, false: Colors.border }}
                      thumbColor={Colors.white}
                    />
                  </View>
                  {p.breakEnabled && (
                    <View style={styles.timeRow}>
                      <TimeField value={p.breakStart} onChange={(v) => setDay(d.key, { breakStart: v })} />
                      <Text variant="caption" muted>
                        –
                      </Text>
                      <TimeField value={p.breakEnd} onChange={(v) => setDay(d.key, { breakEnd: v })} />
                    </View>
                  )}
                </>
              )}
            </View>
          );
        })}

        <View style={styles.cta}>
          <Button label={t("common.save")} onPress={onSave} loading={saving} size="lg" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm },
  card: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.md,
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
  twoCol: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  dayCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadow.sm,
  },
  dayHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  breakRow: { flexDirection: "row", alignItems: "center" },
  cta: { marginTop: spacing.xl },
});
