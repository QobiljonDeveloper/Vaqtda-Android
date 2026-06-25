// ════════════════════════════════════════════════════════════
// src/context/FavoritesContext.tsx (mobil)
// Web'dagi FavoritesContext bilan bir xil: sevimli provayderlar bir marta
// yuklanadi, optimistik toggle. supabase RN singletonidan foydalanadi.
// ════════════════════════════════════════════════════════════

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface FavoritesContextType {
  favoriteIds: Set<string>;
  isFavorite: (providerId: string) => boolean;
  toggle: (providerId: string) => Promise<void>;
  count: number;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isAuthenticated || !user) {
        setFavoriteIds(new Set());
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase
          .from("favorites")
          .select("provider_id")
          .eq("user_id", user.id);
        if (!active) return;
        setFavoriteIds(
          new Set((data ?? []).map((r: { provider_id: string }) => r.provider_id))
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated, user]);

  const toggle = useCallback(
    async (providerId: string) => {
      if (!user) return;
      const has = favoriteIds.has(providerId);

      // Optimistik
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (has) next.delete(providerId);
        else next.add(providerId);
        return next;
      });

      try {
        if (has) {
          const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("provider_id", providerId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("favorites")
            .insert({ user_id: user.id, provider_id: providerId });
          if (error && (error as { code?: string }).code !== "23505") throw error;
        }
      } catch {
        // Xato — orqaga qaytaramiz
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (has) next.add(providerId);
          else next.delete(providerId);
          return next;
        });
      }
    },
    [favoriteIds, user]
  );

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  return (
    <FavoritesContext.Provider
      value={{ favoriteIds, isFavorite, toggle, count: favoriteIds.size, loading }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a FavoritesProvider");
  return ctx;
}
