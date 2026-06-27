import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface MyProvider {
  id: string;
  user_id: string;
  business_name: any;
  slug: string;
  category_id: string | null;
  region_id: string | null;
  location: string | null;
  about: any;
  avatar_url: string | null;
  phone_number: string | null;
  is_active: boolean;
  status: string;
  rating: number | null;
  reviews_count: number | null;
}

/** Joriy foydalanuvchining provayder (biznes) yozuvi. */
export function useMyProvider() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<MyProvider | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setProvider(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("providers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setProvider((data as MyProvider) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { provider, loading, refetch: fetch };
}
