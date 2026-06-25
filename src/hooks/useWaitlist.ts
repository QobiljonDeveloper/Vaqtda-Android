// ════════════════════════════════════════════════════════════
// src/hooks/useWaitlist.ts (mobil)
// Navbat (waitlist) — web bilan bir xil 2 rejim:
//   - ANIQ-KUN (flexible=false): faqat desired_date.
//   - FLEXIBLE/ASAP (flexible=true): [desired_date .. date_to] oralig'i.
// Mobil MVP: izoh (note) yo'q (web'dagi /api/translate bu yerda mavjud emas).
// ════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface WaitlistEntry {
  id: string;
  provider_id: string;
  client_id: string;
  desired_date: string;
  date_to: string | null;
  flexible: boolean;
  duration_minutes: number | null;
  status: "waiting" | "notified" | "converted" | "cancelled" | "expired";
  created_at: string;
}

export interface JoinWaitlistInput {
  flexible: boolean;
  desiredDate: string;
  dateTo?: string | null;
  durationMinutes?: number | null;
}

export function useWaitlist(providerId: string | undefined, desiredDate?: string) {
  const { user, isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!providerId || !user) {
      setEntries([]);
      return;
    }
    const { data } = await supabase
      .from("waitlist")
      .select("*")
      .eq("provider_id", providerId)
      .eq("client_id", user.id)
      .in("status", ["waiting", "notified"]);
    setEntries((data as WaitlistEntry[]) ?? []);
  }, [providerId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const specificEntry =
    entries.find((e) => !e.flexible && e.desired_date === desiredDate) || null;
  const flexibleEntry = entries.find((e) => e.flexible) || null;

  const joinWaitlist = useCallback(
    async (input: JoinWaitlistInput): Promise<{ error?: string }> => {
      if (!isAuthenticated || !user) return { error: "auth" };
      if (!providerId) return { error: "no-provider" };

      setSubmitting(true);
      try {
        const row = {
          provider_id: providerId,
          client_id: user.id,
          desired_date: input.desiredDate,
          date_to: input.flexible ? input.dateTo ?? input.desiredDate : null,
          flexible: !!input.flexible,
          duration_minutes: input.durationMinutes ?? null,
          status: "waiting" as const,
        };
        const { error } = await supabase.from("waitlist").insert(row);
        await refresh();
        // 23505 = allaqachon shu rejimda navbatdasiz
        if (error && (error as { code?: string }).code !== "23505") {
          return { error: error.message };
        }
        return {};
      } finally {
        setSubmitting(false);
      }
    },
    [isAuthenticated, user, providerId, refresh]
  );

  const leaveWaitlist = useCallback(
    async (entryId?: string): Promise<{ error?: string }> => {
      const target = entryId || specificEntry?.id || flexibleEntry?.id;
      if (!target) return {};
      setSubmitting(true);
      try {
        const { error } = await supabase.from("waitlist").delete().eq("id", target);
        await refresh();
        return error ? { error: error.message } : {};
      } finally {
        setSubmitting(false);
      }
    },
    [specificEntry, flexibleEntry, refresh]
  );

  return {
    specificEntry,
    flexibleEntry,
    isOnWaitlistThisDay: !!specificEntry,
    isOnFlexible: !!flexibleEntry,
    submitting,
    joinWaitlist,
    leaveWaitlist,
    refresh,
  };
}
