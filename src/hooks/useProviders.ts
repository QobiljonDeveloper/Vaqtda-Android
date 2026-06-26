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
  slug: string;
  image_url: string | null;
}

export function useProviders(
  search: string,
  categoryId: string | null,
  regionId: string | null = null
) {
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
      if (regionId) q = q.eq("region_id", regionId);

      if (search.trim()) {
        const s = search.trim();
        q = q.or(
          `business_name->>uz.ilike.%${s}%,business_name->>ru.ilike.%${s}%,category_name->>uz.ilike.%${s}%,category_name->>ru.ilike.%${s}%`
        );
      }

      const { data, error } = await q.order("rating", { ascending: false });
      if (error) throw error;
      setProviders((data as ProviderRow[]) ?? []);
    } catch (e: any) {
      setError(e.message ?? "Xatolik");
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, regionId]);

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
      .select("id, name, slug, image_url")
      .then(({ data }) => setCategories((data as CategoryRow[]) ?? []));
  }, []);
  return categories;
}

// Top-rated karusel (bosh sahifa) — RPC get_top_rated_providers.
export function useTopRated() {
  const [items, setItems] = useState<ProviderRow[]>([]);
  useEffect(() => {
    let active = true;
    supabase.rpc("get_top_rated_providers").then(({ data }) => {
      if (!active) return;
      const mapped = ((data as any[]) ?? []).map((p) => ({
        id: p.id,
        user_id: "",
        business_name: p.business_name,
        slug: p.slug,
        location: p.location ?? null,
        about: null,
        avatar_url: p.avatar_url ?? null,
        rating: p.average_rating ?? p.rating ?? 0,
        reviews_count: p.total_reviews ?? p.reviews_count ?? 0,
        is_active: true,
        phone_number: null,
        category_id: null,
        region_id: null,
        category_name: p.category ?? p.category_name ?? null,
        region_name: null,
      })) as ProviderRow[];
      setItems(mapped);
    });
    return () => {
      active = false;
    };
  }, []);
  return items;
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
