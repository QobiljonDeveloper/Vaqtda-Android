import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Stack, useRouter, useSegments } from "expo-router";
import * as QuickActions from "expo-quick-actions";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { ThemeProvider, useColors, useThemeMode } from "@/context/ThemeContext";
import { useWidgetSync } from "@/widgets/useWidgetSync";

if (Platform.OS !== "web") {
  const YaMap = require("react-native-yamap").default;
  const mapKey = process.env.EXPO_PUBLIC_YANDEX_MAPS_KEY;
  if (mapKey) {
    YaMap.init(mapKey);
  }
}

SplashScreen.preventAutoHideAsync().catch(() => {});

const AUTH_ROUTES = ["login", "register", "forgot-password"];

export default function RootLayout() {
  // Brend shrifti — Plus Jakarta Sans (Stitch dizayni).
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LanguageProvider>
            <AuthProvider>
              <FavoritesProvider>
                <NotificationsProvider>
                  <RootNavigator />
                </NotificationsProvider>
              </FavoritesProvider>
            </AuthProvider>
          </LanguageProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const Colors = useColors();
  const { isDark } = useThemeMode();
  const { isAuthenticated, loading } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const segments = useSegments();

  // Home-screen widget'lar uchun ma'lumotni yangilab turamiz (Android).
  useWidgetSync(isAuthenticated);

  // Ikonkani bosib ushlaganda chiqadigan tezkor amallar (app shortcuts).
  useEffect(() => {
    const ru = lang === "ru";
    QuickActions.setItems([
      { id: "search", title: ru ? "Поиск" : "Qidirish", icon: "search", params: { href: "/search" } },
      { id: "bookings", title: ru ? "Мои записи" : "Bronlarim", params: { href: "/bookings" } },
      { id: "favorites", title: ru ? "Избранное" : "Sevimlilar", params: { href: "/favorites" } },
    ]).catch(() => {});
  }, [lang]);

  // Tezkor amal bosilganda mos ekranga o'tish.
  useEffect(() => {
    const go = (action: QuickActions.Action | null) => {
      const href = action?.params?.href;
      if (typeof href === "string") router.push(href as any);
    };
    go(QuickActions.initial ?? null);
    const sub = QuickActions.addListener(go);
    return () => sub.remove();
  }, [router]);

  // Allaqachon kirgan foydalanuvchini auth ekranlaridan uzoqlashtirish.
  useEffect(() => {
    if (loading) return;
    const current = segments[0] ?? "";
    const onAuthScreen = AUTH_ROUTES.includes(current);
    if (isAuthenticated && onAuthScreen) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading, segments, router]);

  if (loading) {
    return (
      <View style={[styles.splash, { backgroundColor: Colors.background }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
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
    </>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center" },
});
