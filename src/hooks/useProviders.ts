import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

// provider_search_view jonli ustunlari (REST orqali tekshirilgan).
export interface ProviderRow {
  id: string;
  user_id: string;
  business_name: any; // string yoki {uz,ru,en}
  slug: string;
  location: string | null; // "lat, lng"
  about: any;
  avatar_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  is_active: boolean;
  phone_number: string | null;
  category_id: string | null;
  region_id: string | null;
  category_name: any;
  region_name: any;
}

export interface CategoryRow {
  id: string;
  name: any; // {uz,ru,en}
}

export function useProviders(search: string, categoryId: string | null) {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from("provider_search_view")
        .select("*")
        .eq("is_active", true);

      if (categoryId) q = q.eq("category_id", categoryId);

      if (search.trim()) {
        const s = search.trim();
        q = q.or(
          `business_name->>uz.ilike.%${s}%,business_name->>ru.ilike.%${s}%,category_name->>uz.ilike.%${s}%,category_name->>ru.ilike.%${s}%`
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      setProviders((data as ProviderRow[]) ?? []);
    } catch (e: any) {
      setError(e.message ?? "Xatolik");
    } finally {
      setLoading(false);
    }
  }, [search, categoryId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { providers, loading, error, refetch: fetch };
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name")
      .then(({ data }) => setCategories((data as CategoryRow[]) ?? []));
  }, []);
  return categories;
}

export function useProviderBySlug(slug: string | undefined) {
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    supabase
      .from("provider_search_view")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        setProvider(data as ProviderRow | null);
        setLoading(false);
      });
  }, [slug]);

  return { provider, loading };
}
