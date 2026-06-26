import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { Colors } from "@/constants/colors";
import { HIT_SLOP } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";

export function NotificationsBell({ color = Colors.text }: { color?: string }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <Pressable
      hitSlop={HIT_SLOP}
      onPress={() => router.push(isAuthenticated ? "/notifications" : "/login")}
      style={styles.wrap}
    >
      <Ionicons name="notifications-outline" size={24} color={color} />
      {isAuthenticated && unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 2 },
  badge: {
    position: "absolute",
    top: -3,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: "800" },
});
