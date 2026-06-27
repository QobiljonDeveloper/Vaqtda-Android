import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { AuthProvider } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Platform } from "react-native";

if (Platform.OS !== "web") {
  const YaMap = require("react-native-yamap").default;
  const mapKey = process.env.EXPO_PUBLIC_YANDEX_MAPS_KEY;
  if (mapKey) {
    YaMap.init(mapKey);
  }
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LanguageProvider>
            <AuthProvider>
              <FavoritesProvider>
                <NotificationsProvider>
                  <StatusBar style="dark" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: Colors.background },
                    }}
                  >
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="login" options={{ presentation: "modal" }} />
                    <Stack.Screen name="register" options={{ presentation: "modal" }} />
                    <Stack.Screen name="forgot-password" options={{ presentation: "modal" }} />
                  </Stack>
                </NotificationsProvider>
              </FavoritesProvider>
            </AuthProvider>
          </LanguageProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
