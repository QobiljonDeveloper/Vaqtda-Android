// Web ilovaning brend ranglari (globals.css'dan) + booking.com darajasidagi
// sayqal uchun kengaytirilgan token'lar. Faqat qo'shildi — eski importlar buzilmaydi.
export const Colors = {
  // Brend
  primary: "#8FB996",
  primaryDark: "#6F9E78",
  primaryDarker: "#557E5E",
  primaryForeground: "#16321E",
  primarySoft: "#EAF2EC",
  primaryTint: "#F3F8F4",

  // Yuzalar
  background: "#FFFFFF",
  backgroundAlt: "#F5F8F5",
  card: "#F8FAF8",
  cardElevated: "#FFFFFF",
  border: "#E6EAE6",
  borderStrong: "#D3DAD3",

  // Matn
  text: "#18181B",
  textMuted: "#6B7280",
  textSubtle: "#9CA3AF",

  // Holat ranglari
  star: "#F5B301",
  danger: "#DC2626",
  dangerSoft: "#FDECEC",
  success: "#16A34A",
  successSoft: "#E7F6EC",
  warning: "#D97706",
  warningSoft: "#FCF1E2",
  info: "#2563EB",
  infoSoft: "#E8EEFD",

  // Yordamchi
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(15, 23, 18, 0.55)",
  skeleton: "#ECEFEC",
  shadowColor: "#0B1F12",
} as const;

export type ColorToken = keyof typeof Colors;
