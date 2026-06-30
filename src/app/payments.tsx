import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Button, Card, IconButton, Text } from "@/components/ui";
import { type ColorPalette } from "@/constants/colors";
import { radius, spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

export default function PaymentsScreen() {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text variant="subtitle">{t("pay.title")}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        <Text variant="body" muted>
          {t("pay.subtitle")}
        </Text>

        {/* Saqlangan kartalar (web bilan bir xil — hozircha demo/informatsion). */}
        <Card elevated padded={false} style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.row}>
              <Ionicons name="card-outline" size={18} color={Colors.primaryDark} />
              <Text variant="bodyStrong">{t("pay.saved_cards")}</Text>
            </View>
            <Text variant="caption" muted style={styles.sectionSub}>
              {t("pay.select_default")}
            </Text>
          </View>

          <View style={styles.sectionInner}>
            {/* Demo karta — web'dagi statik VISA 4242 ko'zgusi, ochiq-oydin demo deb belgilangan. */}
            <View style={styles.cardRow}>
              <View style={styles.brandBadge}>
                <Text variant="caption" color={Colors.white} style={styles.brandText}>
                  VISA
                </Text>
              </View>
              <View style={styles.flex}>
                <View style={styles.row}>
                  <Text variant="bodyStrong">{t("pay.demo_card")}</Text>
                  <Badge label={t("pay.default")} tone="primary" />
                </View>
                <Text variant="caption" muted style={styles.expires}>
                  {t("pay.expires")} 12 / 2029
                </Text>
              </View>
            </View>

            <Button
              label={t("pay.add_method")}
              variant="outline"
              icon="add"
              onPress={() => Alert.alert(t("pay.add_method"), t("pay.coming_soon"))}
            />

            <View style={styles.demoNote}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
              <Text variant="caption" muted style={styles.flex}>
                {t("pay.demo_note")}
              </Text>
            </View>
          </View>
        </Card>

        {/* Xavfsiz to'lov */}
        <Card elevated style={styles.infoCard}>
          <View style={styles.row}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.success} />
            <Text variant="bodyStrong">{t("pay.secure")}</Text>
          </View>
          <Text variant="caption" muted style={styles.infoText}>
            {t("pay.secure_text")}
          </Text>
        </Card>

        {/* To'lov bo'yicha savollar */}
        <Card elevated style={styles.infoCard}>
          <View style={styles.row}>
            <Ionicons name="help-circle-outline" size={18} color={Colors.primaryDark} />
            <Text variant="bodyStrong">{t("pay.billing_q")}</Text>
          </View>
          <Text variant="caption" muted style={styles.infoText}>
            {t("pay.billing_text")}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  section: {},
  sectionHead: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 2,
  },
  sectionSub: { marginTop: 2 },
  sectionInner: { padding: spacing.lg, gap: spacing.md },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    backgroundColor: Colors.primaryTint,
  },
  brandBadge: {
    width: 52,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: Colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { fontWeight: "800", letterSpacing: 1 },
  expires: { marginTop: 2 },
  demoNote: { flexDirection: "row", gap: spacing.xs, alignItems: "flex-start" },
  infoCard: { gap: spacing.sm },
  infoText: { lineHeight: 18 },
});
