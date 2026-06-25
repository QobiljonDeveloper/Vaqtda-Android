// ════════════════════════════════════════════════════════════
// src/components/WaitlistJoinCard.tsx (mobil)
// Navbatga yozilish. Tanlangan kunda bo'sh vaqt bo'lmaganda ko'rsatiladi.
//   - "Shu kun"            -> aniq desired_date
//   - "Iloji boricha tez"  -> faqat TO'LA kunlar bo'yicha [from..to] oraliq (ASAP)
// Bo'sh joyi bor kunlar — "darhol band qiling" tugmalari sifatida ko'rsatiladi.
// ════════════════════════════════════════════════════════════

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useWaitlist } from "@/hooks/useWaitlist";

interface FreeDay {
  date: string;
  label: string;
}

function ddmm(d?: string): string {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return `${day}.${m}`;
}

export function WaitlistJoinCard({
  providerId,
  desiredDate,
  durationMinutes,
  fullDays = [],
  freeDays = [],
  onPickDate,
}: {
  providerId: string;
  desiredDate: string;
  durationMinutes?: number | null;
  fullDays?: string[];
  freeDays?: FreeDay[];
  onPickDate?: (date: string) => void;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { specificEntry, flexibleEntry, submitting, joinWaitlist, leaveWaitlist } =
    useWaitlist(providerId, desiredDate);

  const [mode, setMode] = useState<"specific" | "flexible">("specific");
  const [days, setDays] = useState(0); // 0 -> maxDays

  const hasFlexible = fullDays.length >= 2;
  const maxDays = Math.min(7, fullDays.length);
  const effectiveDays = days >= 2 && days <= maxDays ? days : maxDays;
  const flexFrom = fullDays[0];
  const flexTo = fullDays[Math.min(effectiveDays, fullDays.length) - 1];
  const otherFreeDays = freeDays.filter((d) => d.date !== desiredDate);

  // ─── Allaqachon navbatda ───
  const activeEntry = flexibleEntry || specificEntry;
  if (activeEntry) {
    const isFlex = !!flexibleEntry;
    return (
      <View style={styles.onListCard}>
        <Ionicons name="checkmark-circle" size={26} color={Colors.primaryDark} />
        <Text style={styles.onListTitle}>
          {isFlex ? t("wait.onlist_flex") : t("wait.onlist_day")}
        </Text>
        <Text style={styles.onListDesc}>
          {isFlex
            ? t("wait.onlist_flex_desc")
            : t("wait.onlist_day_desc", { date: ddmm(desiredDate) })}
        </Text>
        <Pressable
          style={styles.leaveBtn}
          onPress={() => leaveWaitlist(activeEntry.id)}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.danger} />
          ) : (
            <Text style={styles.leaveText}>{t("wait.leave")}</Text>
          )}
        </Pressable>
      </View>
    );
  }

  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    const flexible = mode === "flexible" && hasFlexible;
    await joinWaitlist({
      flexible,
      desiredDate: flexible ? flexFrom! : desiredDate,
      dateTo: flexible ? flexTo! : null,
      durationMinutes: durationMinutes ?? null,
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Ionicons name="notifications-outline" size={20} color={Colors.primaryDark} />
        <Text style={styles.title}>{t("wait.title")}</Text>
      </View>
      <Text style={styles.pitch}>{t("wait.pitch")}</Text>

      {/* Bo'sh joyi bor kunlar */}
      {otherFreeDays.length > 0 && (
        <View style={styles.freeBox}>
          <Text style={styles.freeHint}>{t("wait.free_hint")}</Text>
          <View style={styles.chipWrap}>
            {otherFreeDays.map((d) => (
              <Pressable key={d.date} style={styles.freeChip} onPress={() => onPickDate?.(d.date)}>
                <Text style={styles.freeChipText}>{d.label}</Text>
                <Ionicons name="arrow-forward" size={12} color={Colors.primaryDark} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Rejim tanlash */}
      {hasFlexible && (
        <View style={styles.modeCol}>
          <ModeBtn
            active={mode === "specific"}
            icon="calendar-outline"
            label={`${t("wait.mode_specific")} (${ddmm(desiredDate)})`}
            onPress={() => setMode("specific")}
          />
          <ModeBtn
            active={mode === "flexible"}
            icon="flash-outline"
            label={t("wait.mode_flexible")}
            onPress={() => setMode("flexible")}
          />
        </View>
      )}

      {/* ASAP: necha kun ichida */}
      {hasFlexible && mode === "flexible" && (
        <View style={styles.daysBox}>
          <Text style={styles.daysQ}>{t("wait.days_q")}</Text>
          <View style={styles.chipWrap}>
            {Array.from({ length: maxDays - 1 }, (_, i) => i + 2).map((n) => (
              <Pressable
                key={n}
                style={[styles.dayChip, effectiveDays === n && styles.dayChipActive]}
                onPress={() => setDays(n)}
              >
                <Text style={[styles.dayChipText, effectiveDays === n && styles.dayChipTextActive]}>
                  {n} {t("wait.days_unit")}
                </Text>
              </Pressable>
            ))}
          </View>
          {!!flexFrom && !!flexTo && (
            <Text style={styles.range}>
              {t("wait.range")} {ddmm(flexFrom)} – {ddmm(flexTo)}
            </Text>
          )}
        </View>
      )}

      <Pressable style={styles.joinBtn} onPress={handleJoin} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color={Colors.primaryForeground} />
        ) : (
          <Text style={styles.joinText}>
            {isAuthenticated ? t("wait.join") : t("wait.login_join")}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function ModeBtn({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.modeBtn, active && styles.modeBtnActive]} onPress={onPress}>
      <Ionicons name={icon} size={16} color={active ? Colors.primaryForeground : Colors.primaryDark} />
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "800", color: Colors.text },
  pitch: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  freeBox: {
    borderWidth: 1,
    borderColor: "#86C28C",
    backgroundColor: "#F0FAF1",
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  freeHint: { fontSize: 12, fontWeight: "700", color: Colors.primaryDark },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  freeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#86C28C",
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  freeChipText: { fontSize: 12, fontWeight: "700", color: Colors.primaryDark },
  modeCol: { gap: 8 },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  modeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeText: { fontSize: 12, fontWeight: "700", color: Colors.text },
  modeTextActive: { color: Colors.primaryForeground },
  daysBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  daysQ: { fontSize: 12, fontWeight: "700", color: Colors.text },
  dayChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipText: { fontSize: 12, fontWeight: "800", color: Colors.text },
  dayChipTextActive: { color: Colors.primaryForeground },
  range: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" },
  joinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  joinText: { color: Colors.primaryForeground, fontWeight: "800", fontSize: 14 },
  onListCard: {
    borderWidth: 1,
    borderColor: "#86C28C",
    backgroundColor: "#F0FAF1",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  onListTitle: { fontSize: 15, fontWeight: "800", color: Colors.primaryDark },
  onListDesc: { fontSize: 12, color: Colors.textMuted, textAlign: "center" },
  leaveBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  leaveText: { fontSize: 12, fontWeight: "700", color: Colors.danger },
});
