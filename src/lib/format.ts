// Sana / vaqt / narx / masofa formatlash — uz/ru.
import { UZ_MONTHS, UZ_WEEKDAYS, weekdayKeyOf } from "@/lib/tashkent";

type Lang = "uz" | "ru";

const RU_MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const RU_WEEKDAYS: Record<string, string> = {
  Monday: "Понедельник", Tuesday: "Вторник", Wednesday: "Среда",
  Thursday: "Четверг", Friday: "Пятница", Saturday: "Суббота", Sunday: "Воскресенье",
};

/** "2026-06-16" → "16-iyun" / "16 июня" */
export function formatDate(dateStr: string, lang: Lang): string {
  const parts = dateStr.split("-").map(Number);
  const m = parts[1];
  const d = parts[2];
  if (!m || !d) return dateStr;
  return lang === "ru" ? `${d} ${RU_MONTHS[m - 1]}` : `${d}-${UZ_MONTHS[m - 1]}`;
}

export function formatWeekday(dateStr: string, lang: Lang): string {
  const key = weekdayKeyOf(dateStr);
  return lang === "ru" ? RU_WEEKDAYS[key] : UZ_WEEKDAYS[key];
}

/** "Dushanba, 16-iyun" / "Понедельник, 16 июня" */
export function formatDateFull(dateStr: string, lang: Lang): string {
  return `${formatWeekday(dateStr, lang)}, ${formatDate(dateStr, lang)}`;
}

/** 120000 → "120 000 so'm" / "120 000 сум" */
export function formatPrice(n: number | null | undefined, lang: Lang): string {
  if (n == null) return "";
  const s = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return lang === "ru" ? `${s} сум` : `${s} so'm`;
}

/** metr → "850 m" / "1.2 km uzoqlikda" */
export function formatDistance(meters: number | null | undefined, lang: Lang): string {
  if (meters == null) return "";
  if (meters < 1000) {
    const m = Math.round(meters);
    return lang === "ru" ? `в ${m} м` : `${m} m`;
  }
  const km = (meters / 1000).toFixed(1);
  return lang === "ru" ? `в ${km} км` : `${km} km`;
}
