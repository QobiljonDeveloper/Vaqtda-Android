import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, IconButton, Input, Text } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { radius, shadow, spacing } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";

const EMAIL = "support@vaqtda.uz";
const PHONE = "+998712000000";
const TELEGRAM = "https://t.me/vaqtda";
const MAP = "https://yandex.com/maps/10335/tashkent/";

type IconName = keyof typeof Ionicons.glyphMap;

export default function ContactScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const [message, setMessage] = useState("");

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  const sendMessage = () => {
    const body = encodeURIComponent(message.trim());
    open(`mailto:${EMAIL}?subject=Vaqtda&body=${body}`);
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
          placeholder={t("contact.message_placeholder")}
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <Button label={t("contact.send")} icon="send-outline" onPress={sendMessage} />
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

const styles = StyleSheet.create({
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
});
