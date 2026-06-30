import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Banner, Button, Input, Screen, Text } from "@/components/ui";
import { type ColorPalette } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";

/** Supabase xom xatosini do'stona, lokalizatsiyalangan xabarga aylantiradi. */
function mapAuthError(raw: string, t: ReturnType<typeof useLanguage>["t"]): string {
  const msg = raw.toLowerCase();
  if (msg.includes("not confirmed") || msg.includes("not verified")) {
    return t("auth.email_not_verified");
  }
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
    return t("auth.invalid_credentials");
  }
  return raw;
}

export default function LoginScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useLanguage();
  const { login } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ registered?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showRegistered, setShowRegistered] = useState(params.registered === "1");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    const { error } = await login(email.trim(), password);
    if (error) {
      setLoading(false);
      setError(mapAuthError(error, t));
      return;
    }

    // Rolga qarab yo'naltirish (router.back() o'rniga).
    let role = "client";
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .maybeSingle();
        const dbRole = (profile?.role || "client").toLowerCase();
        if (dbRole === "provider" || dbRole === "specialist" || dbRole === "partner") {
          role = "provider";
        }
      }
    } catch {
      // jim — standart client yo'nalishiga tushadi
    }
    setLoading(false);

    if (role === "provider") {
      router.replace("/provider/dashboard");
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <Screen scroll keyboard padded background={Colors.background} contentContainerStyle={styles.screen}>
      <View style={styles.card}>
        {/* Header — logo, brend, subtitle */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Ionicons name="time-outline" size={32} color={Colors.primaryDarker} />
          </View>
          <Text variant="display" center style={styles.brand}>
            {t("auth.brand_name")}
          </Text>
          <Text variant="body" muted center style={styles.sub}>
            {t("auth.login_welcome")}
          </Text>
        </View>

        {showRegistered && (
          <Banner
            variant="success"
            message={t("auth.registered_success")}
            onDismiss={() => setShowRegistered(false)}
          />
        )}

        {/* Form */}
        <View style={styles.form}>
          <Input
            label={t("auth.email_label")}
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
            label={t("auth.password_label")}
            icon="lock-closed-outline"
            placeholder={t("auth.password_placeholder")}
            password
            textContentType="password"
            value={password}
            onChangeText={setPassword}
          />

          <Pressable onPress={() => router.push("/forgot-password")} style={styles.forgot} hitSlop={8}>
            <Text variant="caption" color={Colors.primaryDark} style={styles.forgotText}>
              {t("auth.forgot")}
            </Text>
          </Pressable>

          {error && <Banner variant="error" message={error} onDismiss={() => setError(null)} />}

          <View style={styles.actions}>
            <Button label={t("auth.login")} onPress={onSubmit} loading={loading} size="lg" />

            <Pressable onPress={() => router.replace("/register")} style={styles.link} hitSlop={8}>
              <Text variant="body" muted center>
                {t("auth.register_subtitle")}{" "}
                <Text variant="bodyStrong" color={Colors.primaryDark}>
                  {t("auth.signup")}
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const makeStyles = (Colors: ColorPalette) =>
  StyleSheet.create({
    screen: {
      flexGrow: 1,
      justifyContent: "center",
    },
    card: {
      backgroundColor: Colors.cardElevated,
      borderRadius: radius.xl,
      padding: spacing.xxl,
      gap: spacing.xl,
      ...shadow.md,
    },
    header: {
      alignItems: "center",
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    logoMark: {
      width: 64,
      height: 64,
      borderRadius: radius.lg,
      backgroundColor: Colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.xs,
    },
    brand: {
      letterSpacing: -0.5,
    },
    sub: {
      maxWidth: 280,
    },
    form: {
      gap: spacing.lg,
    },
    forgot: {
      alignSelf: "flex-end",
      marginTop: -spacing.sm,
    },
    forgotText: {
      fontWeight: "600",
    },
    actions: {
      gap: spacing.lg,
      marginTop: spacing.xs,
    },
    link: {
      alignItems: "center",
      marginTop: spacing.xs,
    },
  });
