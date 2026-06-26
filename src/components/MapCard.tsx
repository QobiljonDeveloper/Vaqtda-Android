import { Ionicons } from "@expo/vector-icons";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { Text } from "@/components/ui/Text";
import { Colors } from "@/constants/colors";
import { radius, spacing } from "@/constants/theme";

interface MapCardProps {
  location: string | null; // "lat,lng"
  label: string; // "Xaritada ochish"
  title: string;
}

function parse(loc: string | null): { lat: number; lng: number } | null {
  if (!loc) return null;
  const parts = loc.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return { lat: parts[0], lng: parts[1] };
}

const KEY = process.env.EXPO_PUBLIC_YANDEX_MAPS_KEY ?? "";

export function MapCard({ location, label, title }: MapCardProps) {
  const coords = parse(location);
  if (!coords) return null;

  const { lat, lng } = coords;
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
  <style>html,body,#map{margin:0;padding:0;width:100%;height:100%}</style>
  <script src="https://api-maps.yandex.ru/2.1/?apikey=${KEY}&lang=uz_UZ"></script></head>
  <body><div id="map"></div><script>
  ymaps.ready(function(){var m=new ymaps.Map("map",{center:[${lat},${lng}],zoom:15,controls:["zoomControl"]});
  m.geoObjects.add(new ymaps.Placemark([${lat},${lng}],{},{preset:"islands#greenDotIcon"}));
  m.behaviors.disable("scrollZoom");});
  </script></body></html>`;

  const openExternal = () => {
    const url = Platform.select({
      ios: `https://yandex.com/maps/?ll=${lng},${lat}&z=16&pt=${lng},${lat}`,
      default: `geo:${lat},${lng}?q=${lat},${lng}`,
    });
    Linking.openURL(url!).catch(() =>
      Linking.openURL(`https://yandex.com/maps/?ll=${lng},${lat}&z=16&pt=${lng},${lat}`)
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.mapBox}>
        <WebView
          source={{ html }}
          style={styles.map}
          originWhitelist={["*"]}
          javaScriptEnabled
          scrollEnabled={false}
          pointerEvents="none"
        />
      </View>
      <Pressable style={styles.btn} onPress={openExternal}>
        <Ionicons name="navigate" size={16} color={Colors.primaryDark} />
        <Text variant="bodyStrong" color={Colors.primaryDark}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  mapBox: {
    height: 170,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.skeleton,
  },
  map: { flex: 1 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
    backgroundColor: Colors.primarySoft,
    borderRadius: radius.md,
  },
});
