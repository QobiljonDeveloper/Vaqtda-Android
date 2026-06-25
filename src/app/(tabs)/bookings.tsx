import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { localize } from "@/lib/localize";

interface BookingRow {
  id: string;
  provider_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  business_name?: any;
  [k: string]: any;
}

const STATUS_COLOR: Record<string, string> = {
  upcoming: Colors.primaryDark,
  completed: Colors.textMuted,
  cancelled: Colors.danger,
};

export default function BookingsScreen() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!user?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_bookings_view")
      .select("*")
      .eq("client_id", user.id)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });
    setBookings((data as BookingRow[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>{t("booking.my_bookings")}</Text>
        <Pressable
          style={styles.loginBtn}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.loginText}>{t("auth.login")}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>{t("booking.my_bookings")}</Text>
      {loading ? (
        <ActivityIndicator
          color={Colors.primary}
          size="large"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16 }}
          onRefresh={fetchBookings}
          refreshing={loading}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("mybookings.all")}: 0</Text>
          }
          renderItem={({ item }) => {
            const name =
              localize(item.business_name) ||
              t("mybookings.unknown_provider");
            const color = STATUS_COLOR[item.status] ?? Colors.textMuted;
            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.provName}>{name}</Text>
                  <Text style={styles.dateText}>
                    {item.booking_date} · {item.start_time?.slice(0, 5)}–
                    {item.end_time?.slice(0, 5)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: color }]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  provName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  dateText: { fontSize: 13, color: Colors.textMuted, marginTop: 3 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  empty: { textAlign: "center", color: Colors.textMuted, marginTop: 40 },
  loginBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  loginText: { color: Colors.primaryForeground, fontWeight: "700" },
});
