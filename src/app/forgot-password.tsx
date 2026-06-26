import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, IconButton, Input, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { spacing } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!email.trim()) {
      Alert.alert(t("fp.err_enter_email"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert(t("fp.err_generic"), error.message);
      return;
    }
    setStep(2);
    Alert.alert(t("fp.code_sent", { email: email.trim() }));
  };

  const verifyCode = async () => {
    if (code.trim().length < 6) {
      Alert.alert(t("fp.err_complete_code"));
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
      Alert.alert(t("fp.err_invalid_code"));
      return;
    }
    setStep(3);
  };

  const updatePassword = async () => {
    if (password.length < 6) {
      Alert.alert(t("fp.err_password_short"));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t("fp.err_password_match"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      Alert.alert(t("fp.err_update"), error.message);
      return;
    }
    await supabase.auth.signOut();
    setLoading(false);
    Alert.alert(t("fp.password_updated"), undefined, [
      { text: t("booking.ok"), onPress: () => router.replace("/login") },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <IconButton icon="close" onPress={() => router.back()} />
      </View>

      <View style={styles.content}>
        <Text variant="h1">{step === 3 ? t("fp.step3_title") : step === 2 ? t("fp.step2_title") : t("auth.forgot")}</Text>
        <Text variant="body" muted style={styles.sub}>
          {step === 1 ? t("fp.step1_sub") : step === 2 ? t("fp.step2_sub") : t("fp.step3_sub")}
        </Text>

        {step === 1 && (
          <>
            <Input
              icon="mail-outline"
              placeholder={t("fp.email_placeholder")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Button label={t("fp.continue")} onPress={sendCode} loading={loading} />
          </>
        )}

        {step === 2 && (
          <>
            <Input
              icon="key-outline"
              placeholder="••••••••"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={8}
            />
            <Button label={t("fp.verify")} onPress={verifyCode} loading={loading} />
            <Button label={t("fp.resend")} variant="ghost" onPress={sendCode} />
          </>
        )}

        {step === 3 && (
          <>
            <Input icon="lock-closed-outline" placeholder={t("fp.new_password")} value={password} onChangeText={setPassword} password />
            <Input icon="lock-closed-outline" placeholder={t("fp.confirm_password")} value={confirm} onChangeText={setConfirm} password />
            <Button label={t("fp.change_password")} onPress={updatePassword} loading={loading} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", padding: spacing.md },
  content: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.md, paddingTop: spacing.md },
  sub: { marginBottom: spacing.sm },
});
