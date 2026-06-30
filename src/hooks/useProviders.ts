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

// ── Fuzzy (xato-bardosh) qidiruv yordamchilari ───────────────────────────────
function normText(s: string): string {
  return (s || "").toLowerCase().replace(/['`’ʻ‘]/g, "").trim();
}

/** Levenshtein tahrir masofasi. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/** So'rov matni nishonga "yaqin"mi (qism moslik yoki kichik tahrir masofasi). */
function fuzzyText(query: string, target: string): boolean {
  const q = normText(query);
  const t = normText(target);
  if (!q || !t) return false;
  if (t.includes(q) || q.includes(t)) return true;
  for (const w of t.split(/\s+/)) {
    if (!w) continue;
    if (w.includes(q) || q.includes(w)) return true;
    const d = levenshtein(q, w);
    if (d <= Math.max(1, Math.floor(Math.max(q.length, w.length) * 0.34))) return true;
  }
  return levenshtein(q, t) <= Math.max(2, Math.floor(t.length * 0.3));
}

/** business_name / category_name string yoki {uz,ru,en} bo'lishi mumkin — barcha matnlarni oladi. */
function textValues(v: any): string[] {
  if (!v) return [];
  if (typeof v === "string") return [v];
  if (typeof v === "object") return Object.values(v).filter((x): x is string => typeof x === "string");
  return [];
}

function providerMatches(p: ProviderRow, query: string): boolean {
  const targets = [...textValues(p.business_name), ...textValues(p.category_name)];
  return targets.some((t) => fuzzyText(query, t));
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
      const base = () => {
        let q = supabase.from("provider_search_view").select("*").eq("is_active", true);
        if (categoryId) q = q.eq("category_id", categoryId);
        if (regionId) q = q.eq("region_id", regionId);
        return q;
      };

      const s = search.trim();
      let rows: ProviderRow[] = [];

      if (s) {
        // 1) Tez yo'l: server ilike (aniq / qism moslik).
        const { data, error } = await base()
          .or(
            `business_name->>uz.ilike.%${s}%,business_name->>ru.ilike.%${s}%,category_name->>uz.ilike.%${s}%,category_name->>ru.ilike.%${s}%`
          )
          .order("rating", { ascending: false });
        if (error) throw error;
        rows = (data as ProviderRow[]) ?? [];

        // 2) Topilmasa — fuzzy zaxira: barchasini olib mijoz tomonida solishtiramiz
        //    ("advkat" -> "Advokat" kabi imlo xatolarini ham topadi).
        if (rows.length === 0) {
          const { data: all, error: e2 } = await base().order("rating", { ascending: false });
          if (e2) throw e2;
          rows = ((all as ProviderRow[]) ?? []).filter((p) => providerMatches(p, s));
        }
      } else {
        const { data, error } = await base().order("rating", { ascending: false });
        if (error) throw error;
        rows = (data as ProviderRow[]) ?? [];
      }

      setProviders(rows);
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
      .then(
        ({ data }) => setCategories((data as CategoryRow[]) ?? []),
        () => {}
      );
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
    }, () => {});
    return () => {
      active = false;
    };
  }, []);
  return items;
}

