// ════════════════════════════════════════════════════════════
// src/components/FavoriteButton.tsx (mobil)
// Sevimlilarga qo'shish/olib tashlash yuragi. FavoritesContext'dan foydalanadi.
// Kirmagan foydalanuvchi -> /login.
// ════════════════════════════════════════════════════════════

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";

export function FavoriteButton({
  providerId,
  size = 22,
}: {
  providerId: string;
  size?: number;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(providerId);

  const onPress = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    toggle(providerId);
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityState={{ selected: fav }}
    >
      <Ionicons
        name={fav ? "heart" : "heart-outline"}
        size={size}
        color={fav ? Colors.danger : Colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
});
