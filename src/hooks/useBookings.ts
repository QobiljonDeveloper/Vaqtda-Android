import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface BookingProvider {
  business_name: any;
  avatar_url: string | null;
  slug: string;
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
  price: number | null;
  provider: BookingProvider | null;
}

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
        "id, provider_id, booking_date, start_time, end_time, duration_minutes, status, notes, price, provider:providers(business_name, avatar_url, slug)"
      )
      .eq("client_id", user.id)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      const normalized = (data ?? []).map((b: any) => ({
        ...b,
        provider: Array.isArray(b.provider) ? b.provider[0] ?? null : b.provider ?? null,
      })) as Booking[];
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

  return { bookings, loading, error, cancel, refetch: fetch };
}
