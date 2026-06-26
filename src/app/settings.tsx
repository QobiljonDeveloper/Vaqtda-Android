import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar, Button, IconButton, Input, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { pickImage, uploadImage } from "@/lib/upload";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const { t } = useLanguage();
  const { user, refreshProfile } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setPhone(data.phone ?? "");
          setAvatarUrl(data.avatar_url ?? null);
        }
      });
  }, [user]);

  const onChangeAvatar = async () => {
    if (!user) return;
    const asset = await pickImage({ aspect: [1, 1] });
    if (!asset) return;
    setUploading(true);
    try {
      const url = await uploadImage("assets", `${user.id}/avatar-${Date.now()}`, asset);
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      setAvatarUrl(url);
      await refreshProfile();
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName.trim(), phone: phone.trim(), avatar_url: avatarUrl });
    setSaving(false);
    if (error) Alert.alert(t("settings.save_failed"), error.message);
    else {
      await refreshProfile();
      Alert.alert(t("settings.saved"));
    }
  };

  const onChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t("fp.err_password_short"));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("fp.err_password_match"));
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) Alert.alert(t("fp.err_update"), error.message);
    else {
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert(t("fp.password_updated"));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text variant="subtitle">{t("settings.title")}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarBox}>
          <Avatar uri={avatarUrl} name={fullName || user?.name} size={88} ring />
          <Button
            label={t("settings.avatar")}
            variant="secondary"
            size="sm"
            fullWidth={false}
            icon="camera-outline"
            loading={uploading}
            onPress={onChangeAvatar}
          />
        </View>

        {/* Profil */}
        <Input label={t("auth.full_name")} value={fullName} onChangeText={setFullName} icon="person-outline" />
        <Input
          label={t("auth.phone")}
          value={phone}
          onChangeText={setPhone}
          icon="call-outline"
          keyboardType="phone-pad"
        />
        <Input
          label={t("settings.email")}
          value={user?.email ?? ""}
          editable={false}
          icon="mail-outline"
        />
        <Button label={t("settings.save")} onPress={onSave} loading={saving} />

        {/* Parol */}
        <Text variant="title" style={styles.pwTitle}>
          {t("settings.change_password")}
        </Text>
        <Input label={t("fp.new_password")} value={newPassword} onChangeText={setNewPassword} password icon="lock-closed-outline" />
        <Input label={t("fp.confirm_password")} value={confirmPassword} onChangeText={setConfirmPassword} password icon="lock-closed-outline" />
        <Button
          label={t("fp.change_password")}
          variant="outline"
          onPress={onChangePassword}
          loading={pwSaving}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.huge },
  avatarBox: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  pwTitle: { marginTop: spacing.xl },
});
