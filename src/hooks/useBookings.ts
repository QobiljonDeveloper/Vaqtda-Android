import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface BookingProvider {
  business_name: any;
  avatar_url: string | null;
  slug: string;
  category: any;
}

export interface Booking {
  id: string;
  provider_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  status: string;
  notes: string | null;
  provider: BookingProvider | null;
}

export interface BookingMetrics {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
}

/** Web bilan bir xil: bu statuslar "bo'lajak" deb hisoblanadi. */
const UPCOMING_STATUSES = new Set(["upcoming", "pending", "confirmed"]);

export function useBookings() {
  const { user, isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, provider_id, booking_date, start_time, end_time, duration_minutes, status, notes, provider:providers(business_name, avatar_url, slug, categories(name))"
      )
      .eq("client_id", user.id)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      const normalized = (data ?? []).map((b: any) => {
        const p = Array.isArray(b.provider) ? b.provider[0] ?? null : b.provider ?? null;
        const cat = p
          ? (Array.isArray(p.categories) ? p.categories[0]?.name : p.categories?.name) ?? null
          : null;
        return {
          ...b,
          provider: p
            ? { business_name: p.business_name, avatar_url: p.avatar_url, slug: p.slug, category: cat }
            : null,
        };
      }) as Booking[];
      setBookings(normalized);
    }
    setLoading(false);
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const cancel = useCallback(async (id: string) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) await fetch();
    return { error: error?.message };
  }, [fetch]);

  // Web'dagi metrics bilan bir xil: jami / bo'lajak / yakunlangan / bekor qilingan.
  const metrics = useMemo<BookingMetrics>(() => {
    return {
      total: bookings.length,
      upcoming: bookings.filter((b) => UPCOMING_STATUSES.has(b.status)).length,
      completed: bookings.filter((b) => b.status === "completed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings]);

  return { bookings, metrics, loading, error, cancel, refetch: fetch };
}
