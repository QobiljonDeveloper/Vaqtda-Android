import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Button, IconButton, Input, Screen, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function LoginScreen() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    const { error } = await login(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    router.back();
  };

  return (
    <Screen scroll keyboard padded background={Colors.background}>
      <View style={styles.top}>
        <IconButton icon="close" onPress={() => router.back()} />
      </View>
      <View style={styles.content}>
        <Text variant="display">{t("auth.welcome_back")}</Text>
        <Text variant="body" muted style={styles.sub}>
          {t("auth.login_subtitle")}
        </Text>

        <Input
          icon="mail-outline"
          placeholder={t("auth.email_placeholder")}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          icon="lock-closed-outline"
          placeholder={t("auth.password_placeholder")}
          password
          value={password}
          onChangeText={setPassword}
        />

        <Pressable onPress={() => router.push("/forgot-password")} style={styles.forgot}>
          <Text variant="caption" color={Colors.primaryDark}>
            {t("auth.forgot")}
          </Text>
        </Pressable>

        {error && (
          <Text variant="caption" color={Colors.danger}>
            {error}
          </Text>
        )}

        <Button label={t("auth.login")} onPress={onSubmit} loading={loading} size="lg" />

        <Pressable onPress={() => router.replace("/register")} style={styles.link}>
          <Text variant="body" muted>
            {t("auth.register_subtitle")}{" "}
            <Text variant="bodyStrong" color={Colors.primaryDark}>
              {t("auth.signup")}
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
  forgot: { alignSelf: "flex-end", marginTop: -spacing.xs },
  link: { alignItems: "center", marginTop: spacing.md },
});
