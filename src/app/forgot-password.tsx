import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Banner, Button, IconButton, Input, OtpInput, Text } from "@/components/ui";
import { type ColorPalette } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";

const OTP_LENGTH = 8;
const RESEND_SECONDS = 180;

export default function ForgotPasswordScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useLanguage();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 180s qayta yuborish taymeri. Har soniyada qayta o'rnatiladi (deps: secondsLeft) —
  // bu lint-toza va mo'rt boolean-dep'siz.
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const startTimer = () => setSecondsLeft(RESEND_SECONDS);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const sendCode = async () => {
    setError(null);
    setSuccess(null);
    if (!email.trim()) {
      setError(t("fp.err_enter_email"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      setError(error.message || t("fp.err_generic"));
      return;
    }
    setStep(2);
    setCode("");
    startTimer();
    setSuccess(t("fp.code_sent", { email: email.trim() }));
  };

  const resendCode = async () => {
    if (secondsLeft > 0) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      setError(error.message || t("fp.err_resend"));
      return;
    }
    setCode("");
    startTimer();
    setSuccess(t("fp.code_resent"));
  };

  const verifyCode = async () => {
    setError(null);
    setSuccess(null);
    if (code.trim().length < OTP_LENGTH) {
      setError(t("fp.err_complete_code"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "recovery",
    });
    setLoading(false);
    if (error) {
      setError(t("fp.err_invalid_code"));
      return;
    }
    setSecondsLeft(0);
    setStep(3);
  };

  const updatePassword = async () => {
    setError(null);
    setSuccess(null);
    if (password.length < 6) {
      setError(t("fp.err_password_short"));
      return;
    }
    if (password !== confirm) {
      setError(t("fp.err_password_match"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setError(error.message || t("fp.err_update"));
      return;
    }
    // Avtomatik kirmasligi uchun chiqib ketamiz.
    await supabase.auth.signOut();
    setLoading(false);
    setSuccess(t("fp.password_updated"));
    setTimeout(() => {
      router.replace({ pathname: "/login", params: { registered: "1" } });
    }, 1500);
  };

  const title = step === 3 ? t("fp.step3_title") : step === 2 ? t("fp.step2_title") : t("auth.forgot");
  const sub = step === 1 ? t("fp.step1_sub") : step === 2 ? t("fp.step2_sub") : t("fp.step3_sub");

  // Stitch mockup: har bosqich uchun yumaloq belgi ichida mos ikonka.
  const heroIcon: keyof typeof Ionicons.glyphMap =
    step === 3 ? "lock-open-outline" : step === 2 ? "shield-checkmark-outline" : "mail-outline";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Markazlangan brend sarlavhali yuqori panel (Stitch) */}
      <View style={styles.header}>
        <IconButton icon="arrow-back" color={Colors.primary} onPress={() => router.back()} />
        <Text variant="title" color={Colors.primary} style={styles.brand}>
          Vaqtda
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {success && (
          <Banner
            variant="success"
            message={success}
            onDismiss={() => setSuccess(null)}
            style={styles.banner}
          />
        )}
        {error && (
          <Banner
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            style={styles.banner}
          />
        )}

        {/* Markazlangan karta — Stitch "tasdiqlash kodi" maketi */}
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <Ionicons name={heroIcon} size={28} color={Colors.primary} />
          </View>

          <Text variant="h2" center style={styles.title}>
            {title}
          </Text>
          <Text variant="body" muted center style={styles.sub}>
            {sub}
          </Text>

          {step === 1 && (
            <View style={styles.form}>
              <Input
                icon="mail-outline"
                placeholder={t("fp.email_placeholder")}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
              <Button label={t("fp.continue")} onPress={sendCode} loading={loading} />
            </View>
          )}

          {step === 2 && (
            <View style={styles.form}>
              <OtpInput
                value={code}
                onChange={setCode}
                length={OTP_LENGTH}
                onComplete={() => {}}
                disabled={loading}
                autoFocus
              />

              <Button label={t("fp.verify")} onPress={verifyCode} loading={loading} />

              {/* Taymer + qayta yuborish (Stitch: soat ikonkasi + sanoq) */}
              <View style={styles.resendArea}>
                {secondsLeft > 0 ? (
                  <View style={styles.timerRow}>
                    <Ionicons name="timer-outline" size={16} color={Colors.textMuted} />
                    <Text variant="bodyStrong" color={Colors.textMuted}>
                      {formatTime(secondsLeft)}
                    </Text>
                  </View>
                ) : (
                  <Text variant="caption" muted>
                    {t("fp.no_code")}
                  </Text>
                )}
                <Text
                  variant="bodyStrong"
                  color={secondsLeft > 0 ? Colors.textSubtle : Colors.primaryDark}
                  onPress={resendCode}
                  style={styles.resendLink}
                >
                  {t("fp.resend")}
                </Text>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.form}>
              <Input
                icon="lock-closed-outline"
                placeholder={t("fp.new_password")}
                value={password}
                onChangeText={setPassword}
                password
                textContentType="newPassword"
              />
              <Input
                icon="lock-closed-outline"
                placeholder={t("fp.confirm_password")}
                value={confirm}
                onChangeText={setConfirm}
                password
                textContentType="newPassword"
              />
              <Button label={t("fp.change_password")} onPress={updatePassword} loading={loading} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ColorPalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      height: 56,
    },
    brand: { letterSpacing: -0.3 },
    headerSpacer: { width: 40 },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
      gap: spacing.xxl,
    },
    banner: {},
    card: {
      backgroundColor: Colors.cardElevated,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
      alignItems: "center",
      ...shadow.sm,
    },
    iconBadge: {
      width: 64,
      height: 64,
      borderRadius: radius.pill,
      backgroundColor: Colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    title: { marginBottom: spacing.xs },
    sub: { marginBottom: spacing.xl, maxWidth: 300, lineHeight: 20 },
    form: { width: "100%", gap: spacing.lg },
    resendArea: {
      alignItems: "center",
      gap: spacing.xs,
    },
    timerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    resendLink: { paddingVertical: spacing.xs },
  });
