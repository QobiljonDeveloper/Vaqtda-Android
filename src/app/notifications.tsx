import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, EmptyState, IconButton, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useNotifications, type AppNotification } from "@/context/NotificationsContext";
import { formatDate } from "@/lib/format";
import { localize } from "@/lib/localize";

type IconName = keyof typeof Ionicons.glyphMap;

function iconFor(type: string | null): { name: IconName; bg: string; fg: string } {
  switch (type) {
    case "alert":
      return { name: "warning-outline", bg: Colors.warningSoft, fg: Colors.warning };
    case "promo":
      return { name: "megaphone-outline", bg: Colors.dangerSoft, fg: Colors.danger };
    case "system":
      return { name: "settings-outline", bg: Colors.infoSoft, fg: Colors.info };
    default:
      return { name: "notifications-outline", bg: Colors.primarySoft, fg: Colors.primaryDark };
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { notifications, unreadCount, loading, markRead, markAllRead, remove, refetch } =
    useNotifications();

  const onPressItem = (n: AppNotification) => {
    if (!n.is_read) markRead(n.id);
    const slug = n.data?.slug;
    if (slug) router.push(`/provider/${slug}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text variant="subtitle" style={styles.flex}>
          {t("notif.title")}
        </Text>
        {isAuthenticated && unreadCount > 0 && (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text variant="caption" color={Colors.primaryDark}>
              {t("notif.mark_all")}
            </Text>
          </Pressable>
        )}
      </View>

      {!isAuthenticated ? (
        <View style={styles.center}>
          <EmptyState
            icon="notifications-off-outline"
            title={t("notif.title")}
            subtitle={t("notif.login_desc")}
          />
          <View style={styles.loginBtn}>
            <Button label={t("auth.login")} onPress={() => router.push("/login")} fullWidth={false} />
          </View>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={loading}
          renderItem={({ item }) => {
            const ic = iconFor(item.type);
            const title = localize(item.title) || t("notif.title");
            const body = localize(item.body);
            return (
              <Pressable
                onPress={() => onPressItem(item)}
                style={({ pressed }) => [
                  styles.card,
                  !item.is_read && styles.cardUnread,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: ic.bg }]}>
                  <Ionicons name={ic.name} size={20} color={ic.fg} />
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {title}
                  </Text>
                  {!!body && (
                    <Text variant="caption" muted numberOfLines={2}>
                      {body}
                    </Text>
                  )}
                  <Text variant="caption" color={Colors.textSubtle} style={styles.time}>
                    {formatDate(item.created_at.slice(0, 10), lang)}
                  </Text>
                </View>
                {!item.is_read && <View style={styles.dot} />}
                <IconButton
                  icon="trash-outline"
                  size={18}
                  color={Colors.textMuted}
                  onPress={() => remove(item.id)}
                />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="notifications-outline"
                title={t("notif.empty_title")}
                subtitle={t("notif.empty_desc")}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  center: { flex: 1, justifyContent: "center" },
  loginBtn: { alignItems: "center", marginTop: -spacing.lg },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
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
  cardUnread: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  pressed: { opacity: 0.9 },
  iconWrap: { width: 42, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  time: { marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
});
