import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

import { Colors } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(base: string) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={(focused ? base : `${base}-outline`) as IconName} color={color} size={size} />
  );
}

export default function TabsLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryDark,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          borderTopColor: Colors.border,
          backgroundColor: Colors.background,
          height: Platform.OS === "ios" ? 86 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("nav.home"), tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="bookings" options={{ title: t("booking.my_bookings"), tabBarIcon: tabIcon("calendar") }} />
      <Tabs.Screen name="favorites" options={{ title: t("fav.title"), tabBarIcon: tabIcon("heart") }} />
      <Tabs.Screen name="profile" options={{ title: t("header.dashboard"), tabBarIcon: tabIcon("person") }} />
    </Tabs>
  );
}
