import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface ReviewProfile {
  full_name: string | null;
  avatar_url: string | null;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  profiles: ReviewProfile | null;
}

export type ReviewSort = "newest" | "highest" | "lowest";

export function useReviews(providerId: string | undefined, userId?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  // Foydalanuvchining shu provayderda yakunlangan broni bormi (sharh yozish sharti).
  // Web ProviderProfileUI bilan bir xil: bookings status='completed'.
  const [canReview, setCanReview] = useState(false);

  // Web kabi: sahifa ochilishida o'tib ketgan bronlarni 'completed' qilamiz,
  // so'ng shu foydalanuvchining yakunlangan broni borligini tekshiramiz.
  const checkCanReview = useCallback(async () => {
    if (!providerId || !userId) {
      setCanReview(false);
      return;
    }
    try {
      await supabase.rpc("complete_past_bookings");
    } catch {
      /* RPC bo'lmasa ham davom etamiz */
    }
    const { data } = await supabase
      .from("bookings")
      .select("id")
      .eq("client_id", userId)
      .eq("provider_id", providerId)
      .eq("status", "completed")
      .limit(1);
    setCanReview(!!data && data.length > 0);
  }, [providerId, userId]);

  useEffect(() => {
    checkCanReview();
  }, [checkCanReview]);

  const fetch = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select(
        "id, rating, comment, created_at, user_id, profiles!reviews_user_id_fkey(full_name, avatar_url)"
      )
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });
    // profiles to-one bog'lanish — massiv bo'lib kelsa ham birinchisini olamiz.
    const normalized = (data ?? []).map((r: any) => ({
      ...r,
      profiles: Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles ?? null,
    })) as Review[];
    setReviews(normalized);
    setLoading(false);
  }, [providerId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const submit = useCallback(
    async (userId: string, rating: number, comment: string) => {
      if (!providerId) return { error: "no provider" };
      const { error } = await supabase
        .from("reviews")
        .upsert(
          { provider_id: providerId, user_id: userId, rating, comment: comment.trim() || null },
          { onConflict: "provider_id,user_id" }
        );
      if (!error) await fetch();
      return { error: error?.message };
    },
    [providerId, fetch]
  );

  const remove = useCallback(
    async (id: string, userId: string) => {
      await supabase.from("reviews").delete().eq("id", id).eq("user_id", userId);
      await fetch();
    },
    [fetch]
  );

  const report = useCallback(async (reviewId: string, userId: string, reason: string) => {
    const { error } = await supabase
      .from("review_reports")
      .insert({ review_id: reviewId, user_id: userId, reason: reason.trim() || null });
    // 23505 = allaqachon shikoyat qilingan — bu ham OK.
    return { error: error && (error as { code?: string }).code !== "23505" ? error.message : undefined };
  }, []);

  const { avg, count } = useMemo(() => {
    const c = reviews.length;
    if (!c) return { avg: 0, count: 0 };
    const sum = reviews.reduce((s, r) => s + (r.rating ?? 0), 0);
    return { avg: Math.round((sum / c) * 10) / 10, count: c };
  }, [reviews]);

  // Reyting taqsimoti (5..1) — web ProviderProfileUI.distribution bilan bir xil.
  const distribution = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((stars) => ({
        stars,
        count: reviews.filter((r) => Math.round(r.rating) === stars).length,
      })),
    [reviews]
  );

  return {
    reviews,
    loading,
    avg,
    count,
    distribution,
    canReview,
    submit,
    remove,
    report,
    refetch: fetch,
  };
}
