import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/context/ThemeContext";

export default function TabsLayout() {
  const { t } = useLanguage();
  const Colors = useColors();
  // Telefonning pastki tizim paneli (gesture/navbar) balandligi. Shu qadar
  // tab bar'ni ko'taramiz, aks holda yorliqlar pastda kesilib qoladi.
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "android" ? insets.bottom : 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryDark,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          paddingBottom: Platform.OS === "web" ? 8 : 0,
        },
        tabBarStyle: {
          borderTopColor: Colors.border,
          backgroundColor: Colors.background,
          height: (Platform.OS === "ios" ? 88 : Platform.OS === "web" ? 60 : 64) + bottomInset,
          paddingTop: 4,
          paddingBottom: Platform.OS === "ios" ? 28 : bottomInset,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.home"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t("booking.my_bookings"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t("fav.title"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "heart" : "heart-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("dash.nav_dashboard"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
