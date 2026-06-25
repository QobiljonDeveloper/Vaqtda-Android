import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProviderCard } from "@/components/ProviderCard";
import { Colors } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";
import { useCategories, useProviders } from "@/hooks/useProviders";
import { localize } from "@/lib/localize";

export default function HomeScreen() {
  const { t, lang, toggle } = useLanguage();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const categories = useCategories();
  const { providers, loading, error, refetch } = useProviders(search, categoryId);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Vaqtda.uz</Text>
          <Text style={styles.subtitle}>{t("search.title")}</Text>
        </View>
        <Pressable style={styles.langBtn} onPress={toggle}>
          <Text style={styles.langText}>{lang === "uz" ? "RU" : "UZ"}</Text>
        </Pressable>
      </View>

      {/* Qidiruv */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("search.placeholder_main")}
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Kategoriyalar */}
      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            label={t("mybookings.all")}
            active={categoryId === null}
            onPress={() => setCategoryId(null)}
          />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={localize(c.name)}
              active={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Ro'yxat */}
      {loading ? (
        <ActivityIndicator
          color={Colors.primary}
          style={{ marginTop: 40 }}
          size="large"
        />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={loading}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("search.no_results")}</Text>
          }
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

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  brand: { fontSize: 24, fontWeight: "800", color: Colors.primaryDark },
  subtitle: { fontSize: 13, color: Colors.textMuted, maxWidth: 250 },
  langBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langText: { fontWeight: "700", color: Colors.text },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  chipsWrap: { paddingLeft: 16, marginTop: 14 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: Colors.primaryForeground },
  list: { padding: 16 },
  error: { textAlign: "center", color: Colors.danger, marginTop: 40 },
  empty: { textAlign: "center", color: Colors.textMuted, marginTop: 40 },
});
