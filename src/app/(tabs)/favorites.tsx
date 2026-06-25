import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProviderCard } from "@/components/ProviderCard";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import type { ProviderRow } from "@/hooks/useProviders";

export default function FavoritesScreen() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { favoriteIds } = useFavorites();
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user || favoriteIds.size === 0) {
        setProviders([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("provider_search_view")
        .select("*")
        .in("id", Array.from(favoriteIds));
      if (!active) return;
      setProviders((data as ProviderRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user, favoriteIds]);

  // Olib tashlangani darhol yo'qolsin
  const visible = providers.filter((p) => favoriteIds.has(p.id));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Ionicons name="heart" size={22} color={Colors.danger} />
        <Text style={styles.title}>{t("fav.title")}</Text>
      </View>

      {!isAuthenticated ? (
        <Empty
          icon="heart-outline"
          text={t("fav.empty_desc")}
          cta={t("auth.login")}
          onPress={() => router.push("/login")}
        />
      ) : loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : visible.length === 0 ? (
        <Empty
          icon="heart-outline"
          text={t("fav.empty_desc")}
          cta={t("fav.explore")}
          onPress={() => router.push("/")}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProviderCard
              provider={item}
              onPress={() => router.push(`/provider/${item.slug}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Empty({
  icon,
  text,
  cta,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={Colors.primary} />
      <Text style={styles.emptyText}>{text}</Text>
      <Pressable style={styles.cta} onPress={onPress}>
        <Text style={styles.ctaText}>{cta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: { fontSize: 22, fontWeight: "800", color: Colors.text },
  list: { padding: 16 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyText: { textAlign: "center", color: Colors.textMuted, fontSize: 15, lineHeight: 22 },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  ctaText: { color: Colors.primaryForeground, fontWeight: "800", fontSize: 14 },
});
