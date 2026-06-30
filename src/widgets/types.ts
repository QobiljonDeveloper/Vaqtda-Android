// Home-screen widget'lar uchun "snapshot" — ilova yozadi, widget task handler
// AsyncStorage'dan o'qiydi. Widget headless kontekstda ishlaydi (React tree yo'q,
// context yo'q), shuning uchun barcha matn shu yerda OLDINDAN tayyorlangan
// (tarjima qilingan, formatlangan) bo'lishi shart.

export type WidgetLang = "uz" | "ru";

export interface UpcomingBookingSnap {
  /** Provayder nomi (tarjima qilingan). */
  providerName: string;
  /** "Bugun" / "Ertaga" / "16-iyun". */
  dateLabel: string;
  /** "15:00". */
  timeLabel: string;
}

export interface ScheduleEntrySnap {
  /** "09:00". */
  time: string;
  /** Mijoz ismi yoki "Band". */
  label: string;
}

export interface ProviderStatsSnap {
  /** "4 250 000 so'm". */
  revenue: string;
  /** Jami bronlar. */
  total: number;
  /** Noyob mijozlar. */
  clients: number;
  /** "4.8". */
  rating: string;
}

export interface WidgetSnapshot {
  lang: WidgetLang;
  /** Yangilangan vaqt (ms). Faqat ko'rsatish/diagnostika uchun. */
  updatedAt: number;
  /** Foydalanuvchi kirgan bo'lsa true. */
  signedIn: boolean;

  // ── Foydalanuvchi ma'lumotlari ──
  upcomingCount: number;
  nextBooking: UpcomingBookingSnap | null;

  // ── Provayder ma'lumotlari (foydalanuvchi provayder bo'lsa) ──
  isProvider: boolean;
  todayCount: number;
  schedule: ScheduleEntrySnap[];
  stats: ProviderStatsSnap | null;
}

export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  lang: "uz",
  updatedAt: 0,
  signedIn: false,
  upcomingCount: 0,
  nextBooking: null,
  isProvider: false,
  todayCount: 0,
  schedule: [],
  stats: null,
};

// react-native-android-widget plugin'idagi nomlar bilan bir xil bo'lishi SHART.
export const WIDGET_NAMES = {
  search: "Search",
  upcoming: "Upcoming",
  schedule: "Schedule",
  stats: "Stats",
} as const;

// Deep-link'lar (app.json scheme = "vaqtda"). OPEN_URI bularni native ochadi.
export const WIDGET_LINKS = {
  search: "vaqtda://search",
  bookings: "vaqtda://bookings",
  dashboard: "vaqtda://provider/dashboard",
  stats: "vaqtda://provider/stats",
} as const;
