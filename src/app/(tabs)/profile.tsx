import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar, Badge, Button, Divider, EmptyState, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

type IconName = keyof typeof Ionicons.glyphMap;

export default function ProfileScreen() {
  const { t, lang, setLang } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <EmptyState
            icon="person-circle-outline"
            title={t("auth.welcome_back")}
            subtitle={t("auth.login_subtitle")}
            actionLabel={t("auth.login")}
            onAction={() => router.push("/login")}
          />
          <Pressable onPress={() => router.push("/register")} style={styles.signup}>
            <Text variant="bodyStrong" color={Colors.primaryDark}>
              {t("auth.signup")}
            </Text>
          </Pressable>
        </View>
        <LangSwitch lang={lang} setLang={setLang} t={t} />
      </SafeAreaView>
    );
  }

  const isProvider = user?.role === "provider";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text variant="h2" style={styles.title}>
          {t("header.dashboard")}
        </Text>

        {/* User kartasi */}
        <Pressable style={styles.userCard} onPress={() => router.push("/settings")}>
          <Avatar uri={user?.avatar} name={user?.name} size={60} ring />
          <View style={styles.flex}>
            <Text variant="subtitle" numberOfLines={1}>
              {user?.name}
            </Text>
            <Text variant="caption" muted numberOfLines={1}>
              {user?.email}
            </Text>
            <View style={styles.roleBadge}>
              <Badge label={t(isProvider ? "auth.provider" : "auth.client")} tone="primary" />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </Pressable>

        {/* Menyu */}
        <View style={styles.menu}>
          <MenuRow icon="calendar-outline" label={t("menu.my_bookings")} onPress={() => router.push("/bookings")} />
          <Divider />
          <MenuRow icon="heart-outline" label={t("menu.favorites")} onPress={() => router.push("/favorites")} />
          <Divider />
          <MenuRow icon="notifications-outline" label={t("menu.notifications")} onPress={() => router.push("/notifications")} />
          <Divider />
          <MenuRow icon="settings-outline" label={t("menu.settings")} onPress={() => router.push("/settings")} />
          <Divider />
          <MenuRow icon="chatbubble-ellipses-outline" label={t("menu.contact")} onPress={() => router.push("/contact")} />
        </View>

        {/* Provayder bo'limi */}
        <Text variant="label" muted style={styles.sectionLabel}>
          {t("settings.provider_zone").toUpperCase()}
        </Text>
        <View style={styles.menu}>
          {isProvider ? (
            <>
              <MenuRow icon="grid-outline" label={t("menu.provider_dashboard")} onPress={() => router.push("/provider/dashboard")} />
              <Divider />
              <MenuRow icon="stats-chart-outline" label={t("pdash.stats")} onPress={() => router.push("/provider/stats")} />
            </>
          ) : (
            <MenuRow
              icon="briefcase-outline"
              label={t("menu.add_business")}
              onPress={() => router.push("/provider/add-business")}
            />
          )}
        </View>

        <LangSwitch lang={lang} setLang={setLang} t={t} />

        <View style={styles.logout}>
          <Button
            label={t("auth.logout")}
            variant="outline"
            icon="log-out-outline"
            onPress={logout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={Colors.primaryDark} />
      </View>
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

function LangSwitch({
  lang,
  setLang,
  t,
}: {
  lang: "uz" | "ru";
  setLang: (l: "uz" | "ru") => void;
  t: (k: any) => string;
}) {
  return (
    <View style={styles.langWrap}>
      <Text variant="label" muted style={styles.sectionLabel}>
        {t("settings.language").toUpperCase()}
      </Text>
      <View style={styles.langRow}>
        {(["uz", "ru"] as const).map((l) => (
          <Pressable
            key={l}
            style={[styles.langChip, lang === l && styles.langChipActive]}
            onPress={() => setLang(l)}
          >
            <Text
              variant="bodyStrong"
              color={lang === l ? Colors.primaryForeground : Colors.textMuted}
            >
              {l.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center" },
  signup: { alignItems: "center", marginTop: -spacing.lg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.huge },
  title: { marginBottom: spacing.lg },
  userCard: {
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
  roleBadge: { marginTop: 6 },
  menu: {
    backgroundColor: Colors.cardElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: spacing.lg,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  rowPressed: { backgroundColor: Colors.backgroundAlt },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.xs, marginLeft: 2 },
  langWrap: {},
  langRow: { flexDirection: "row", gap: spacing.sm },
  langChip: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  langChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  logout: { marginTop: spacing.xl },
});
