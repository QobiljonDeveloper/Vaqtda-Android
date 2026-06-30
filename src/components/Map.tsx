import React, { useMemo } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { Colors, type ColorPalette } from "@/constants/colors";
import { useThemedStyles } from "@/context/ThemeContext";

export interface MapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  markerTitle?: string;
  style?: ViewStyle;
}

export function Map({ latitude, longitude, zoom = 15, markerTitle, style }: MapProps) {
  const styles = useThemedStyles(makeStyles);
  const isWeb = Platform.OS === "web";

  const mapContent = useMemo(() => {
    if (isWeb) {
      // Web uchun iframe: Yandex Map Widget
      const iframeSrc = `https://yandex.com/map-widget/v1/?ll=${longitude},${latitude}&z=${zoom}&pt=${longitude},${latitude},pm2rdl`;
      
      // Iframe'ni createElement orqali yasaymiz (RNW uchun TypeScript xato bermasligi maqsadida)
      const { createElement } = require("react-native");
      return createElement("iframe", {
        src: iframeSrc,
        width: "100%",
        height: "100%",
        style: { border: 0 },
        allowFullScreen: true,
      });
    } else {
      // Native uchun react-native-yamap
      const YaMap = require("react-native-yamap").default;
      const { Marker } = require("react-native-yamap");

      return (
        <YaMap
          initialRegion={{
            lat: latitude,
            lon: longitude,
            zoom: zoom,
          }}
          style={StyleSheet.absoluteFill}
          showUserPosition={false}
        >
          <Marker
            point={{ lat: latitude, lon: longitude }}
            scale={1.2}
          />
        </YaMap>
      );
    }
  }, [latitude, longitude, zoom, isWeb]);

  return (
    <View style={[styles.container, style]}>
      {/* Soft Dark (Midnight Slate) o'rab turuvchi element */}
      <View style={styles.mapWrapper}>
        {mapContent}
      </View>
    </View>
  );
}

const makeStyles = (Colors: ColorPalette) => StyleSheet.create({
  container: {
    // Premium Midnight Slate (Soft Dark) fon va border o'rniga padding
    backgroundColor: "#1B1E28", 
    borderRadius: 18,
    padding: 6, // Xarita atrofiga yumshoq ramka
    shadowColor: "#05060A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  mapWrapper: {
    flex: 1,
    width: "100%",
    height: "100%",
    minHeight: 200, // Xarita yo'qolib qolmasligi uchun minimum balandlik
    overflow: "hidden",
    borderRadius: 14, // Ichki xarita burchaklari
    backgroundColor: "#242838", // Xarita yuklanguncha ko'rinadigan soft dark fon
  },
});
