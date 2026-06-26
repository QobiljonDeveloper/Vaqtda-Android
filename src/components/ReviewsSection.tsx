import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { Avatar, Button, Chip, Input, Sheet, Stars, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useReviews, type Review, type ReviewSort } from "@/hooks/useReviews";
import { formatDate } from "@/lib/format";

interface Props {
  providerId: string;
  onAggregate?: (avg: number, count: number) => void;
}

export function ReviewsSection({ providerId, onAggregate }: Props) {
  const { t, lang } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const { reviews, avg, count, submit, remove, report } = useReviews(providerId);

  const [sort, setSort] = useState<ReviewSort>("newest");
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const existing = useMemo(
    () => reviews.find((r) => r.user_id === user?.id) ?? null,
    [reviews, user]
  );

  useEffect(() => {
    onAggregate?.(avg, count);
  }, [avg, count, onAggregate]);

  useEffect(() => {
    if (existing) {
      setMyRating(existing.rating);
      setMyComment(existing.comment ?? "");
    }
  }, [existing]);

  const sorted = useMemo(() => {
    const arr = [...reviews];
    if (sort === "highest") arr.sort((a, b) => b.rating - a.rating);
    else if (sort === "lowest") arr.sort((a, b) => a.rating - b.rating);
    // newest = allaqachon created_at desc (hook tartibi)
    return arr;
  }, [reviews, sort]);

  const onSubmit = async () => {
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    if (myRating <= 0) {
      Alert.alert(t("profile.rate_this"));
      return;
    }
    setSaving(true);
    const { error } = await submit(user.id, myRating, myComment);
    setSaving(false);
    if (!error) Alert.alert(t("profile.thanks"));
    else Alert.alert(t("common.error"), error);
  };

  const onDelete = () => {
    if (!existing || !user) return;
    Alert.alert(t("common.delete"), "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await remove(existing.id, user.id);
          setMyRating(0);
          setMyComment("");
        },
      },
    ]);
  };

  const onSendReport = async () => {
    if (!reportId || !user) return;
    await report(reportId, user.id, reason);
    setReportId(null);
    setReason("");
    Alert.alert(t("profile.report_received"), t("profile.report_soon"));
  };

  return (
    <View style={styles.wrap}>
      {/* Sarlavha + xulosa */}
      <Text variant="title">{t("profile.reviews_title")}</Text>
      <View style={styles.summary}>
        <Text variant="display" color={Colors.text}>
          {avg.toFixed(1)}
        </Text>
        <View>
          <Stars value={avg} size={18} />
          <Text variant="caption" muted style={styles.basedOn}>
            {t("profile.based_on", { n: count })}
          </Text>
        </View>
      </View>

      {/* Sharh yozish */}
      {isAuthenticated ? (
        <View style={styles.writeBox}>
          <Text variant="bodyStrong">{t("profile.rate_this")}</Text>
          <View style={styles.starRow}>
            <Stars value={myRating} onChange={setMyRating} size={32} />
          </View>
          <Input
            placeholder={t("profile.review_placeholder")}
            value={myComment}
            onChangeText={setMyComment}
            multiline
          />
          <View style={styles.writeActions}>
            <Button
              label={existing ? t("common.save") : t("profile.send")}
              onPress={onSubmit}
              loading={saving}
              size="md"
              fullWidth={!existing}
              style={existing ? styles.flex : undefined}
            />
            {existing && (
              <Button
                label={t("common.delete")}
                onPress={onDelete}
                variant="outline"
                size="md"
                fullWidth={false}
                icon="trash-outline"
              />
            )}
          </View>
        </View>
      ) : (
        <Pressable style={styles.loginHint} onPress={() => router.push("/login")}>
          <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
          <Text variant="caption" muted>
            {t("profile.rate_locked")}
          </Text>
        </Pressable>
      )}

      {/* Saralash */}
      {count > 0 && (
        <View style={styles.sortRow}>
          <Chip label={t("profile.sort_newest")} size="sm" active={sort === "newest"} onPress={() => setSort("newest")} />
          <Chip label={t("profile.sort_highest")} size="sm" active={sort === "highest"} onPress={() => setSort("highest")} />
          <Chip label={t("profile.sort_lowest")} size="sm" active={sort === "lowest"} onPress={() => setSort("lowest")} />
        </View>
      )}

      {/* Ro'yxat */}
      {count === 0 ? (
        <Text variant="body" muted style={styles.empty}>
          {t("profile.no_reviews")}
        </Text>
      ) : (
        sorted.map((r) => (
          <ReviewItem
            key={r.id}
            review={r}
            lang={lang}
            isOwn={r.user_id === user?.id}
            onReport={() => setReportId(r.id)}
          />
        ))
      )}

      {/* Shikoyat sheet */}
      <Sheet visible={!!reportId} onClose={() => setReportId(null)} title={t("profile.report")}>
        <Text variant="body" muted style={styles.reportQ}>
          {t("profile.report_reason_q")}
        </Text>
        <Input
          placeholder={t("profile.report_placeholder")}
          value={reason}
          onChangeText={setReason}
          multiline
        />
        <View style={styles.reportBtn}>
          <Button label={t("profile.send")} onPress={onSendReport} />
        </View>
      </Sheet>
    </View>
  );
}

function ReviewItem({
  review,
  lang,
  isOwn,
  onReport,
}: {
  review: Review;
  lang: "uz" | "ru";
  isOwn: boolean;
  onReport: () => void;
}) {
  const name = review.profiles?.full_name ?? "—";
  return (
    <View style={styles.item}>
      <Avatar uri={review.profiles?.avatar_url} name={name} size={40} />
      <View style={styles.flex}>
        <View style={styles.itemHead}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {name}
          </Text>
          {!isOwn && (
            <Pressable onPress={onReport} hitSlop={8}>
              <Ionicons name="flag-outline" size={15} color={Colors.textSubtle} />
            </Pressable>
          )}
        </View>
        <View style={styles.itemMeta}>
          <Stars value={review.rating} size={13} />
          <Text variant="caption" color={Colors.textSubtle}>
            {formatDate(review.created_at.slice(0, 10), lang)}
          </Text>
        </View>
        {!!review.comment && (
          <Text variant="body" style={styles.comment}>
            {review.comment}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  flex: { flex: 1 },
  summary: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  basedOn: { marginTop: 4 },
  writeBox: {
    gap: spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.lg,
  },
  starRow: { alignItems: "flex-start", paddingVertical: spacing.xs },
  writeActions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  loginHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sortRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  empty: { paddingVertical: spacing.md },
  item: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  itemHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  itemMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  comment: { marginTop: 4, lineHeight: 20 },
  reportQ: { marginBottom: spacing.sm },
  reportBtn: { marginTop: spacing.md },
});
