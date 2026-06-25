import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function ProfileScreen() {
  const { t, lang, setLang } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Ionicons name="person-circle-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.welcome}>{t("auth.welcome_back")}</Text>
        <Text style={styles.sub}>{t("auth.login_subtitle")}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.push("/login")}>
          <Text style={styles.primaryText}>{t("auth.login")}</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/register")}>
          <Text style={styles.link}>{t("auth.signup")}</Text>
        </Pressable>
        <LangSwitch lang={lang} setLang={setLang} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.userBox}>
        <Image source={{ uri: user?.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      <LangSwitch lang={lang} setLang={setLang} />

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
        <Text style={styles.logoutText}>{t("auth.logout")}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function LangSwitch({
  lang,
  setLang,
}: {
  lang: "uz" | "ru";
  setLang: (l: "uz" | "ru") => void;
}) {
  return (
    <View style={styles.langRow}>
      {(["uz", "ru"] as const).map((l) => (
        <Pressable
          key={l}
          style={[styles.langChip, lang === l && styles.langChipActive]}
          onPress={() => setLang(l)}
        >
          <Text
            style={[styles.langChipText, lang === l && styles.langChipTextActive]}
          >
            {l.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  welcome: { fontSize: 22, fontWeight: "800", color: Colors.text },
  sub: { fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  primaryText: { color: Colors.primaryForeground, fontWeight: "700", fontSize: 16 },
  link: { color: Colors.primaryDark, fontWeight: "600", marginTop: 4 },
  userBox: { alignItems: "center", gap: 6, paddingVertical: 24 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.border,
  },
  name: { fontSize: 20, fontWeight: "800", color: Colors.text },
  email: { fontSize: 14, color: Colors.textMuted },
  roleBadge: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  roleText: { color: Colors.primaryDark, fontWeight: "600", fontSize: 12 },
  langRow: { flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 10 },
  langChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  langChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  langChipText: { fontWeight: "700", color: Colors.textMuted },
  langChipTextActive: { color: Colors.primaryForeground },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: "auto",
  },
  logoutText: { color: Colors.danger, fontWeight: "700", fontSize: 16 },
});
