import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Banner, Button, IconButton, Input, Screen, Text } from "@/components/ui";
import { type ColorPalette } from "@/constants/colors";
import { fontFamily, fontWeight, radius, shadow, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

export default function RegisterScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useLanguage();
  const { register } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"Client" | "Specialist">("Client");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    // Telefon ixtiyoriy.
    const { error } = await register(
      email.trim(),
      password,
      fullName.trim(),
      phone.trim(),
      role
    );
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    // Bloklovchi Alert o'rniga login ekraniga "emailni tekshiring" parametri bilan o'tish.
    router.replace({ pathname: "/login", params: { registered: "1" } });
  };

  return (
    <Screen scroll keyboard padded background={Colors.background}>
      {/* Logo sarlavha — back tugmasi va markazda brend */}
      <View style={styles.appbar}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text variant="title" color={Colors.primaryDark} center style={styles.brand}>
          Vaqtda
        </Text>
        <View style={styles.appbarSpacer} />
      </View>

      {/* Forma kartasi */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="h2">{t("auth.join")}</Text>
          <Text variant="body" muted>
            {t("auth.register_subtitle")}
          </Text>
        </View>

        {/* Rol — segmentli tanlov */}
        <View style={styles.roleBlock}>
          <Text variant="bodyStrong">{t("auth.role_question")}</Text>
          <View style={styles.segment}>
            <Pressable
              onPress={() => setRole("Client")}
              style={[styles.segmentItem, role === "Client" && styles.segmentItemActive]}
            >
              <Text
                variant="bodyStrong"
                color={role === "Client" ? Colors.primaryForeground : Colors.textMuted}
              >
                {t("auth.client")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setRole("Specialist")}
              style={[styles.segmentItem, role === "Specialist" && styles.segmentItemActive]}
            >
              <Text
                variant="bodyStrong"
                color={role === "Specialist" ? Colors.primaryForeground : Colors.textMuted}
              >
                {t("auth.provider")}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Maydonlar */}
        <View style={styles.inputs}>
          <Input
            icon="person-outline"
            placeholder={t("auth.full_name")}
            textContentType="name"
            value={fullName}
            onChangeText={setFullName}
          />
          <Input
            icon="mail-outline"
            placeholder={t("auth.email_placeholder")}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            icon="call-outline"
            placeholder={`${t("auth.phone")} (${t("auth.optional")})`}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            value={phone}
            onChangeText={setPhone}
          />
          <Input
            icon="lock-closed-outline"
            placeholder={t("auth.password_placeholder")}
            password
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Shartlar */}
        <View style={styles.terms}>
          <Ionicons name="shield-checkmark-outline" size={16} color={Colors.textMuted} />
          <Text variant="caption" muted style={styles.termsText}>
            {t("auth.terms_agree")}{" "}
            <Text variant="caption" color={Colors.primaryDark}>
              {t("auth.terms")}
            </Text>{" "}
            {t("auth.and")}{" "}
            <Text variant="caption" color={Colors.primaryDark}>
              {t("auth.privacy")}
            </Text>
          </Text>
        </View>

        {error && <Banner variant="error" message={error} onDismiss={() => setError(null)} />}

        <Button label={t("auth.create_account")} onPress={onSubmit} loading={loading} size="lg" />

        {/* Kirish havolasi */}
        <Pressable onPress={() => router.replace("/login")} style={styles.link}>
          <Text variant="body" muted center>
            {t("auth.login_subtitle")}{" "}
            <Text variant="bodyStrong" color={Colors.primaryDark}>
              {t("auth.login")}
            </Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const makeStyles = (Colors: ColorPalette) =>
  StyleSheet.create({
    appbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.lg,
    },
    brand: { flex: 1, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },
    appbarSpacer: { width: 44 },
    card: {
      backgroundColor: Colors.cardElevated,
      borderRadius: radius.xl,
      padding: spacing.xxl,
      gap: spacing.lg,
      ...shadow.md,
    },
    cardHeader: { gap: spacing.xs },
    roleBlock: { gap: spacing.sm },
    segment: {
      flexDirection: "row",
      gap: spacing.xs,
      backgroundColor: Colors.background,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: spacing.xs,
    },
    segmentItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
    },
    segmentItemActive: { backgroundColor: Colors.primary, ...shadow.sm },
    inputs: { gap: spacing.md },
    terms: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    termsText: { flex: 1, lineHeight: 18 },
    link: { alignItems: "center", marginTop: spacing.xs },
  });
