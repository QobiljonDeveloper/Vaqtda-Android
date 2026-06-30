import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { Badge, Text } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { type ColorPalette } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";

/** Bitta kun jadvalidagi bron yozuvi (vaqt oralig'i + ixtiyoriy boyitilgan ma'lumot). */
export interface TimelineEntry {
  id: string;
  start_time: string;
  end_time: string;
  /** Boyitilgan ma'lumot (faqat provayder o'z bronlarini o'qiy olsa mavjud bo'ladi). */
  clientName?: string | null;
  serviceName?: string | null;
  durationMinutes?: number | null;
  status?: string | null;
  notes?: string | null;
}

interface DayTimelineProps {
  entries: TimelineEntry[];
  /** Toshkent hozirgi vaqti (HH:mm) — joriy/o'tgan bronlarni belgilash uchun. */
  nowHhmm?: string;
  /** Tanlangan kun bugunmi (now chizig'ini ko'rsatish uchun). */
  isToday?: boolean;
  durationLabel: (min: number) => string;
  statusLabel: (status: string) => string;
}

function hhmm(t: string | null | undefined): string {
  return (t ?? "").slice(0, 5);
}

// Haqiqiy status to'plami (web/useBookings bilan bir xil):
// upcoming/pending/confirmed (bo'lajak), completed (yakunlangan), cancelled (bekor).
function statusTone(status: string | null | undefined): BadgeTone {
  switch (status) {
    case "completed":
      return "success";
    case "cancelled":
      return "danger";
    case "confirmed":
      return "info";
    case "upcoming":
    case "pending":
    default:
      return "warning";
  }
}

/**
 * Vertikal, vaqt bo'yicha tartiblangan kunlik jadval (timeline).
 * Har bir bron boshlanish→tugash vaqti, mijoz/xizmat va status bilan ko'rsatiladi.
 */
export function DayTimeline({ entries, nowHhmm, isToday, durationLabel, statusLabel }: DayTimelineProps) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.wrap}>
      {/* Vertikal timeline chizig'i (vaqt ustuni yonida) */}
      <View style={styles.spine} pointerEvents="none" />

      {entries.map((e) => {
        const isPast = isToday && nowHhmm != null && hhmm(e.end_time) <= nowHhmm;
        const isCurrent =
          isToday && nowHhmm != null && hhmm(e.start_time) <= nowHhmm && hhmm(e.end_time) > nowHhmm;
        const cancelled = e.status === "cancelled" || e.status === "rejected" || e.status === "no_show";

        const accent = isCurrent
          ? Colors.primary
          : cancelled
            ? Colors.danger
            : statusTone(e.status) === "info"
              ? Colors.info
              : Colors.primary;

        return (
          <View key={e.id} style={styles.row}>
            {/* Vaqt ustuni */}
            <View style={styles.timeCol}>
              <Text variant="bodyStrong" style={isPast && styles.dim}>
                {hhmm(e.start_time)}
              </Text>
              <Text variant="caption" muted>
                {hhmm(e.end_time)}
              </Text>
            </View>

            {/* Bron kartasi (chap chetida rangli urg'u chizig'i) */}
            <View
              style={[
                styles.card,
                { borderLeftColor: accent },
                isCurrent && styles.cardCurrent,
                (isPast || cancelled) && styles.cardDim,
              ]}
            >
              <View style={styles.cardTop}>
                <Text variant="subtitle" numberOfLines={1} style={styles.flex}>
                  {e.clientName?.trim() || hhmm(e.start_time) + "–" + hhmm(e.end_time)}
                </Text>
                {e.status ? <Badge label={statusLabel(e.status)} tone={statusTone(e.status)} /> : null}
              </View>

              {e.serviceName?.trim() ? (
                <View style={styles.metaRow}>
                  <Ionicons name="cut-outline" size={15} color={Colors.textMuted} />
                  <Text variant="caption" muted numberOfLines={1} style={styles.flex}>
                    {e.serviceName}
                  </Text>
                </View>
              ) : null}

              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={15} color={Colors.textMuted} />
                <Text variant="caption" muted>
                  {hhmm(e.start_time)}–{hhmm(e.end_time)}
                  {e.durationMinutes ? ` · ${durationLabel(e.durationMinutes)}` : ""}
                </Text>
              </View>

              {e.notes?.trim() ? (
                <Text variant="caption" muted numberOfLines={2} style={styles.notes}>
                  {e.notes}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (Colors: ColorPalette) =>
  StyleSheet.create({
    wrap: { position: "relative" },
    spine: {
      position: "absolute",
      left: 51,
      top: 6,
      bottom: 6,
      width: 1,
      backgroundColor: Colors.borderStrong,
    },
    flex: { flex: 1 },
    dim: { opacity: 0.55 },
    row: { flexDirection: "row", gap: spacing.lg, marginBottom: spacing.xxl },
    timeCol: { width: 44, alignItems: "flex-start", paddingTop: 6 },
    card: {
      flex: 1,
      backgroundColor: Colors.cardElevated,
      borderRadius: radius.xl,
      borderLeftWidth: 4,
      borderLeftColor: Colors.primary,
      padding: spacing.lg,
      gap: spacing.sm,
      ...shadow.sm,
    },
    cardCurrent: { backgroundColor: Colors.primarySoft },
    cardDim: { opacity: 0.6 },
    cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    notes: { marginTop: 2, fontStyle: "italic" },
  });
