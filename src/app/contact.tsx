import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, IconButton, Input, Text } from "@/components/ui";
import { type ColorPalette } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import { useColors, useThemedStyles } from "@/context/ThemeContext";

const EMAIL = "support@vaqtda.uz";
const PHONE = "+998712000000";
const TELEGRAM = "https://t.me/vaqtda";
const MAP = "https://yandex.com/maps/10335/tashkent/";

// Web /api/contact bilan bir xil Telegram yetkazib berish (server'siz, to'g'ridan-to'g'ri).
const TG_TOKEN = process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.EXPO_PUBLIC_TELEGRAM_CHAT_ID;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type IconName = keyof typeof Ionicons.glyphMap;

export default function ContactScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useLanguage();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  // Web ContactForm validatsiyasi bilan bir xil shartlar.
  const sendMessage = async () => {
    if (fullName.trim().length < 3) {
      Alert.alert(t("contact.err_name"));
      return;
    }
    if (phone.trim().length > 0 && phone.trim().length < 7) {
      Alert.alert(t("contact.err_phone"));
      return;
    }
    if (message.trim().length < 10) {
      Alert.alert(t("contact.err_message"));
      return;
    }

    setSending(true);
    try {
      // Web /api/contact bilan bir xil: nom/telefon/xabar -> Telegram guruhi.
      // Server yo'q — to'g'ridan-to'g'ri Telegram Bot API chaqiriladi.
      if (!TG_TOKEN || !TG_CHAT) throw new Error("no_telegram_config");

      const text = [
        "📬 <b>Yangi Aloqa So'rovi! (Mobil)</b>",
        "",
        `👤 <b>Ism:</b> ${escapeHtml(fullName.trim())}`,
        `📞 <b>Telefon:</b> <code>${escapeHtml(phone.trim() || "—")}</code>`,
        "✉️ <b>Xabar:</b>",
        `<i>${escapeHtml(message.trim())}</i>`,
      ].join("\n");

      const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: "HTML" }),
      });

      if (!res.ok) throw new Error("telegram_failed");

      Alert.alert(t("contact.sent"));
      setFullName("");
      setPhone("");
      setMessage("");
    } catch {
      // Edge Function deploy qilinmagan/ishlamasa — chiroyli fallback:
      // foydalanuvchiga email orqali yuborishni taklif qilamiz.
      Alert.alert(t("contact.err_send"), t("contact.fallback_email"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("contact.email_us"),
          onPress: () => {
            const subject = encodeURIComponent("Vaqtda");
            const body = encodeURIComponent(
              `${fullName.trim()}\n${phone.trim()}\n\n${message.trim()}`
            );
            open(`mailto:${EMAIL}?subject=${subject}&body=${body}`);
          },
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text variant="subtitle">{t("menu.contact")}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="h1">
          {t("contact.title_a")} {t("contact.title_b")}
        </Text>
        <Text variant="body" muted style={styles.sub}>
          {t("contact.subtitle")}
        </Text>

        <ActionCard icon="mail-outline" title={t("contact.email_us")} value={EMAIL} onPress={() => open(`mailto:${EMAIL}`)} />
        <ActionCard icon="call-outline" title={t("contact.call_us")} value={PHONE} onPress={() => open(`tel:${PHONE}`)} />
        <ActionCard icon="paper-plane-outline" title="Telegram" value="@vaqtda" onPress={() => open(TELEGRAM)} />
        <ActionCard icon="location-outline" title={t("contact.visit_us")} value={t("profile.city")} onPress={() => open(MAP)} />

        <Text variant="title" style={styles.formTitle}>
          {t("contact.message")}
        </Text>

        <Input
          label={t("auth.full_name")}
          placeholder={t("auth.full_name")}
          value={fullName}
          onChangeText={setFullName}
          icon="person-outline"
          editable={!sending}
        />
        <Input
          label={t("auth.phone")}
          placeholder="+998 90 000 00 00"
          value={phone}
          onChangeText={setPhone}
          icon="call-outline"
          keyboardType="phone-pad"
          editable={!sending}
        />
        <Input
          placeholder={t("contact.message_placeholder")}
          value={message}
          onChangeText={setMessage}
          multiline
          editable={!sending}
        />
        <Button
          label={sending ? t("contact.sending") : t("contact.send")}
          icon="send-outline"
          loading={sending}
          onPress={sendMessage}
        />

        <Text variant="caption" muted style={styles.privacy}>
          {t("contact.privacy_agree")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({
  icon,
  title,
  value,
  onPress,
}: {
  icon: IconName;
  title: string;
  value: string;
  onPress: () => void;
}) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.cardIcon}>
        <Ionicons name={icon} size={22} color={Colors.primaryDark} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" muted>
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.huge },
  sub: { marginBottom: spacing.sm },
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
  pressed: { opacity: 0.9 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  formTitle: { marginTop: spacing.lg },
  privacy: { marginTop: spacing.xs, textAlign: "center" },
});
