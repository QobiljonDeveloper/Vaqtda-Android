// Widget snapshot'ni Supabase'dan yangilaydi. Ilova ochilganda / old planga
// qaytganda chaqiriladi (useWidgetSync). Widget'ning o'zi tarmoqqa chiqmaydi —
// shu yerda tayyorlangan snapshot'ni o'qiydi, demak doim tez va ishonchli.
//
// CHEKLOV: ma'lumot ilova ishlatilganda yangilanadi. Ilova uzoq ochilmasa
// widget eski (lekin tushunarli) holatni ko'rsatadi.

import { Platform } from "react-native";

import { formatDate, formatPrice } from "@/lib/format";
import { localize } from "@/lib/localize";
import { supabase } from "@/lib/supabase";
import { addDaysStr, createTashkentClock } from "@/lib/tashkent";

import { writeSnapshot } from "./storage";
import {
  EMPTY_SNAPSHOT,
  WIDGET_NAMES,
  type ScheduleEntrySnap,
  type WidgetLang,
  type WidgetSnapshot,
} from "./types";

const UPCOMING_STATUSES = ["upcoming", "pending", "confirmed"];
const clock = createTashkentClock();

function dateLabel(dateStr: string, today: string, lang: WidgetLang): string {
  if (dateStr === today) return lang === "ru" ? "Сегодня" : "Bugun";
  if (dateStr === addDaysStr(today, 1)) return lang === "ru" ? "Завтра" : "Ertaga";
  return formatDate(dateStr, lang);
}

async function resolveLang(): Promise<WidgetLang> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const saved = await AsyncStorage.getItem("lang");
    return saved === "ru" ? "ru" : "uz";
  } catch {
    return "uz";
  }
}

/** Foydalanuvchining keyingi bronlari. */
async function loadUser(userId: string, today: string, lang: WidgetLang) {
  const { data } = await supabase
    .from("bookings")
    .select("booking_date, start_time, status, provider:providers(business_name, slug)")
    .eq("client_id", userId)
    .gte("booking_date", today)
    .in("status", UPCOMING_STATUSES)
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(20);

  const rows = (data as any[]) ?? [];
  const first = rows[0];
  const p = first ? (Array.isArray(first.provider) ? first.provider[0] : first.provider) : null;

  return {
    upcomingCount: rows.length,
    nextBooking: first
      ? {
          providerName: localize(p?.business_name, lang) || (p?.slug ?? "—"),
          dateLabel: dateLabel(first.booking_date, today, lang),
          timeLabel: String(first.start_time).slice(0, 5),
        }
      : null,
  };
}

/** Provayderning bugungi jadvali — avval o'z bronlari (RLS), bo'lmasa busy_slots. */
async function loadSchedule(providerId: string, today: string): Promise<ScheduleEntrySnap[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("start_time, client:profiles(full_name)")
    .eq("provider_id", providerId)
    .neq("status", "cancelled")
    .eq("booking_date", today)
    .order("start_time", { ascending: true })
    .limit(6);

  const rows = (data as any[]) ?? [];
  if (!error && rows.length > 0) {
    return rows.map((b) => {
      const c = Array.isArray(b.client) ? b.client[0] : b.client;
      return { time: String(b.start_time).slice(0, 5), label: c?.full_name ?? "Band" };
    });
  }

  // RLS o'z bronlarini bermasa — band vaqt oraliqlari (faqat vaqt).
  const { data: busy } = await supabase.rpc("get_busy_slots", {
    p_provider: providerId,
    p_from: today,
    p_to: today,
  });
  return ((busy as any[]) ?? [])
    .slice(0, 6)
    .map((b) => ({ time: String(b.start_time).slice(0, 5), label: "Band" }));
}

/** Provayder statistikasi (umumiy davr). */
async function loadStats(providerId: string, rating: number | null, lang: WidgetLang) {
  const { data } = await supabase
    .from("bookings")
    .select("client_id, status, price")
    .eq("provider_id", providerId);

  const rows = (data as any[]) ?? [];
  const notCancelled = rows.filter((r) => r.status !== "cancelled");
  const revenue = rows
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + (r.price ?? 0), 0);
  const clients = new Set(notCancelled.map((r) => r.client_id)).size;

  return {
    revenue: formatPrice(revenue, lang),
    total: rows.length,
    clients,
    rating: (rating ?? 0).toFixed(1),
  };
}

/** Asosiy: snapshot quradi, yozadi, har bir widget'ni yangilashga buyuradi. */
export async function syncWidgets(): Promise<void> {
  if (Platform.OS !== "android") return;

  const lang = await resolveLang();
  const today = clock.now().dateStr;

  const snap: WidgetSnapshot = { ...EMPTY_SNAPSHOT, lang, updatedAt: Date.now() };

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (userId) {
      snap.signedIn = true;

      const user = await loadUser(userId, today, lang);
      snap.upcomingCount = user.upcomingCount;
      snap.nextBooking = user.nextBooking;

      const { data: prov } = await supabase
        .from("providers")
        .select("id, rating")
        .eq("user_id", userId)
        .maybeSingle();

      if (prov?.id) {
        snap.isProvider = true;
        const [schedule, stats] = await Promise.all([
          loadSchedule(prov.id, today),
          loadStats(prov.id, (prov as any).rating ?? null, lang),
        ]);
        snap.schedule = schedule;
        snap.todayCount = schedule.length;
        snap.stats = stats;
      }
    }
  } catch {
    /* tarmoq xatosi — bo'sh/eski snapshot bilan ketadi */
  }

  await writeSnapshot(snap);
  await pushUpdates(snap);
}

/** Har bir o'rnatilgan widget'ni yangi snapshot bilan qayta chizish. */
async function pushUpdates(snap: WidgetSnapshot): Promise<void> {
  try {
    const { requestWidgetUpdate } = await import("react-native-android-widget");
    const { renderForWidget } = await import("./render");
    const names = Object.values(WIDGET_NAMES);
    await Promise.all(
      names.map((widgetName) =>
        requestWidgetUpdate({
          widgetName,
          // info: WidgetInfo (joriy o'lcham) — root sizing uchun uzatiladi.
          renderWidget: (info) => renderForWidget(widgetName, snap, info),
          widgetNotFound: () => {},
        }).catch((err) => {
          if (__DEV__) console.warn(`[widgets] update ${widgetName} failed:`, err);
        })
      )
    );
  } catch (err) {
    // kutubxona yo'q yoki widget qo'yilmagan — odatda e'tiborsiz
    if (__DEV__) console.warn("[widgets] pushUpdates failed:", err);
  }
}
