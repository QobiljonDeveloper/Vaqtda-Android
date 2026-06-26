import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { Button, Chip, IconButton, Input, Screen, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function RegisterScreen() {
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
    const { error } = await register(email.trim(), password, fullName.trim(), phone.trim(), role);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    Alert.alert(t("auth.join"), t("auth.secure_text"), [
      { text: t("booking.ok"), onPress: () => router.replace("/login") },
    ]);
  };

  return (
    <Screen scroll keyboard padded background={Colors.background}>
      <View style={styles.top}>
        <IconButton icon="close" onPress={() => router.back()} />
      </View>
      <View style={styles.content}>
        <Text variant="display">{t("auth.join")}</Text>
        <Text variant="body" muted style={styles.sub}>
          {t("auth.register_subtitle")}
        </Text>

        {/* Rol */}
        <View style={styles.roleRow}>
          <Chip label={t("auth.client")} active={role === "Client"} onPress={() => setRole("Client")} />
          <Chip label={t("auth.provider")} active={role === "Specialist"} onPress={() => setRole("Specialist")} />
        </View>

        <Input icon="person-outline" placeholder={t("auth.full_name")} value={fullName} onChangeText={setFullName} />
        <Input
          icon="mail-outline"
          placeholder={t("auth.email_placeholder")}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          icon="call-outline"
          placeholder={t("auth.phone")}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <Input
          icon="lock-closed-outline"
          placeholder={t("auth.password_placeholder")}
          password
          value={password}
          onChangeText={setPassword}
        />

        {error && (
          <Text variant="caption" color={Colors.danger}>
            {error}
          </Text>
        )}

        <Button label={t("auth.create_account")} onPress={onSubmit} loading={loading} size="lg" />

        <Pressable onPress={() => router.replace("/login")} style={styles.link}>
          <Text variant="body" muted>
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

const styles = StyleSheet.create({
  top: { flexDirection: "row" },
  content: { gap: spacing.md, marginTop: spacing.lg },
  sub: { marginBottom: spacing.sm },
  roleRow: { flexDirection: "row", gap: spacing.sm },
  link: { alignItems: "center", marginTop: spacing.md },
});
