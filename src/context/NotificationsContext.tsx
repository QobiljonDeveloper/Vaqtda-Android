// In-app bildirishnomalar + realtime + lokal push banner.
// Web useNotifications bilan bir xil: fetch(50), unread, markRead, markAllRead, remove,
// realtime INSERT'da prepend. Mobil qo'shimcha: yangi kelganda lokal banner ko'rsatadi.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { localize } from "@/lib/localize";
import {
  addNotificationResponseListener,
  presentLocal,
  registerForPush,
} from "@/lib/push";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string | null;
  title: any;
  body: any;
  data: any;
  is_read: boolean;
  created_at: string;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as AppNotification[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Realtime: yangi bildirishnoma kelsa — ro'yxat boshiga qo'shamiz + lokal banner.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as AppNotification;
          setNotifications((prev) => [n, ...prev.filter((p) => p.id !== n.id)]);
          // data'ga type'ni ham qo'shamiz — banner bosilganda deep-link to'g'ri ishlashi uchun.
          presentLocal(localize(n.title) || "Vaqtda", localize(n.body), {
            ...(n.data ?? {}),
            type: n.type,
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Push ruxsatini best-effort so'raymiz (token DB'ga saqlanmaydi — DB'ga tegmayapmiz).
  useEffect(() => {
    if (isAuthenticated) registerForPush().catch(() => {});
  }, [isAuthenticated]);

  // OS push/local bildirishnoma bosilganda deep-link bilan tegishli ekranga o'tamiz
  // (background/quit holatdan ham). Web NotificationsBell handleClick bilan bir xil.
  useEffect(() => {
    const unsub = addNotificationResponseListener();
    return unsub;
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }, [user]);

  const remove = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, markRead, markAllRead, remove, refetch: fetch }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider");
  return ctx;
}
