// Manzilni xaritadan tanlash (web LocationPicker bilan parity).
// Native: yamap'da bosib joylashuvni belgilash + "Joriy joylashuv".
// Web: oddiy lat/lng kiritish (yamap native-only).
// Saqlanadigan format web bilan bir xil: "lat, lng".
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";

import { Button, Input, Sheet, Text } from "@/components/ui";
import { Colors, type ColorPalette } from "@/constants/colors";
import { radius, spacing } from "@/constants/theme";
import { useColors, useThemedStyles } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

const DEFAULT: [number, number] = [41.2995, 69.2401]; // Toshkent (web default bilan bir xil)

interface Props {
  visible: boolean;
  onClose: () => void;
  /** "lat, lng" yoki null */
  value: string | null;
  /** "lat, lng" formatda saqlaydi */
  onSave: (location: string) => void;
}

function parse(loc: string | null): [number, number] {
  if (!loc) return DEFAULT;
  const parts = loc.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
    return [parts[0], parts[1]];
  }
  return DEFAULT;
}

export function LocationPickerSheet({ visible, onClose, value, onSave }: Props) {
  const Colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useLanguage();

  const [coords, setCoords] = useState<[number, number]>(() => parse(value));
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (visible) setCoords(parse(value));
  }, [visible, value]);

  const useCurrent = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("search.location_denied"));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords([Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6))]);
    } finally {
      setLocating(false);
    }
  };

  const confirm = () => {
    onSave(`${coords[0]}, ${coords[1]}`);
    onClose();
  };

  // Native yamap — bosish orqali pin qo'yiladi (web'dagi draggable placemark o'rniga)
  const renderMap = () => {
    if (Platform.OS === "web") {
      return (
        <View style={styles.webFallback}>
          <Input
            label={t("ab.latitude")}
            value={String(coords[0])}
            keyboardType="numbers-and-punctuation"
            onChangeText={(v) => setCoords(([, lng]) => [parseFloat(v) || 0, lng])}
          />
          <Input
            label={t("ab.longitude")}
            value={String(coords[1])}
            keyboardType="numbers-and-punctuation"
            onChangeText={(v) => setCoords(([lat]) => [lat, parseFloat(v) || 0])}
          />
        </View>
      );
    }

    const YaMap = require("react-native-yamap").default;
    const { Marker } = require("react-native-yamap");

    return (
      <View style={styles.mapBox}>
        <YaMap
          initialRegion={{ lat: coords[0], lon: coords[1], zoom: 14 }}
          style={StyleSheet.absoluteFill}
          showUserPosition={false}
          onMapPress={(e: any) => {
            const p = e?.nativeEvent;
            if (p && typeof p.lat === "number" && typeof p.lon === "number") {
              setCoords([Number(p.lat.toFixed(6)), Number(p.lon.toFixed(6))]);
            }
          }}
        >
          <Marker point={{ lat: coords[0], lon: coords[1] }} scale={1.3} />
        </YaMap>
        <View style={styles.hint} pointerEvents="none">
          <Ionicons name="location" size={14} color={Colors.white} />
          <Text variant="caption" color={Colors.white}>
            {t("ab.tap_to_set")}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t("booking.location")} scroll>
      <View style={styles.body}>
        {renderMap()}

        <View style={styles.coordRow}>
          <Ionicons name="navigate-outline" size={14} color={Colors.textMuted} />
          <Text variant="caption" muted>
            {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
          </Text>
        </View>

        <Pressable style={styles.currentBtn} onPress={useCurrent} disabled={locating}>
          <Ionicons name="locate" size={18} color={Colors.primaryDark} />
          <Text variant="bodyStrong" color={Colors.primaryDark}>
            {locating ? t("common.loading") : t("ab.use_current")}
          </Text>
        </Pressable>

        <Button label={t("common.save")} onPress={confirm} size="lg" />
      </View>
    </Sheet>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  body: { gap: spacing.md },
  mapBox: {
    height: 260,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#242838",
  },
  webFallback: { gap: spacing.md },
  hint: {
    position: "absolute",
    bottom: spacing.sm,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  coordRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  currentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.md,
    backgroundColor: Colors.primarySoft,
    borderRadius: radius.md,
  },
});
