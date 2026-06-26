# WORKLOG — booking-mobile (avtonom sessiya)

> Bu fayl Claude tomonidan avtonom ishlash davomida yuritiladi.
> Maqsad: React Native (Expo) appni 100% web (Booking) bilan parity'ga yetkazish,
> booking.com darajasida sayqal, iOS + Android.

## Foydalanuvchi qarorlari (2026-06-27)
- **Qamrov:** Mijoz + provayder (to'liq parity). Admin KIRMAYDI.
- **Dizayn:** Web brend ranglari (#8FB996 yashil) + booking.com darajasida zamonaviy native UX.
- **Bildirishnoma:** Push + in-app.
- **Git:** Commit + push. ⚠️ booking-mobile'da REMOTE YO'Q — faqat lokal commit qildim.
  Uyg'onganda: `git remote add origin <url> && git push -u origin main`.

## Cheklovlar
- DB sxema/RLS/SQL'ga TEGILMAYDI. Faqat mavjud jadvallarga app orqali normal yozish.
- Maxfiy kalitlar (.env'ga service_role/Gemini) QO'YILMAYDI.
- Men telefon/simulyatorni interaktiv test qila olmadim — tekshiruv: `tsc --noEmit` + `expo export`.
- **Push (ilova yopiqligida):** to'liq kod yozildi, LEKIN haqiqiy yetkazish uchun
  EAS project + token DB'da saqlash kerak (DB'ga tegmadim). O'sha qadam hujjatlashtirildi.

## Reja (fazalar)
- [ ] F0. Poydevor: paketlar, app.json (iOS bundleId, plugin'lar), build tekshiruvi
- [ ] F1. Dizayn tizimi: theme + UI primitives (Button, Card, Input, Chip, Badge, Avatar, Sheet, Skeleton, Rating, EmptyState, SectionHeader, Toast)
- [ ] F2. Navigatsiya: stack/tab qayta tuzilishi (yangi ekranlar uchun route'lar)
- [ ] F3. Home/landing (hero, kategoriyalar, "qanday ishlaydi", top-rated) + sayqal
- [ ] F4. Search: AI/region/geolokatsiya + kategoriya sahifasi
- [ ] F5. Provayder detali: galereya, xarita, sharhlar (ko'rish+yozish+o'chirish+report), share
- [ ] F6. Bookings: boshqaruv (bekor qilish), tafsilot
- [ ] F7. Profil: tahrirlash (avatar/ism/telefon), parol almashtirish, forgot-password
- [ ] F8. Notifications: in-app ro'yxat + qo'ng'iroqcha + push (registratsiya/handler/lokal)
- [ ] F9. Contact sahifasi
- [ ] F10. Provayder tomoni: dashboard, biznes qo'shish/tahrirlash, timetable, statistika
- [ ] F11. Yakuniy sayqal: animatsiya, skeleton, haptics, dark mode tekshiruv
- [ ] F12. Yakuniy tekshiruv: tsc + expo export + commit/log

## Qo'shimcha talab (2026-06-27, ish boshida)
- Bypass permissions YOQILDI — to'liq avtonom.
- Q1: Mobil — buglar, mantiqiy optimizatsiya, performance (re-render, FlatList, query), kod qisqartirish.
- Q2: Web (Booking) — SEO (metadata, OG, sitemap, robots, JSON-LD, hreflang).
- Q3: Web (Booking) — buglar + mantiqiy optimizatsiya.
- Task list yaratildi (TaskCreate #1–16).

## Log
(pastga qo'shib boriladi)

### F0 — boshlandi
- Web (Booking) va mobil holatini to'liq o'rgandim (inventarizatsiya).
- Yo'qolgan paketlarni o'rnatish boshlandi: @supabase/supabase-js, async-storage,
  url-polyfill, expo-notifications, expo-image-picker, expo-location,
  react-native-webview, expo-clipboard, expo-haptics, @react-native-community/datetimepicker.
- ⚠️ booking-mobile git remote yo'qligi aniqlandi.

### F0 ✅ + F1 ✅ (commit 61163f4)
- Paketlar to'liq o'rnatildi (npm install + expo install). vector-icons qo'shildi.
- Template cruft o'chirildi. app.json yangilandi (iOS bundleId, plugin'lar, permissionlar).
- Dizayn tizimi: src/constants/theme.ts + src/components/ui/* (16 primitiv). tsc TOZA.

### Shared qatlam ✅ (commit 0145e97)
- locale kalitlari (notif/geo/share/stats/menu/cancel/home), lib/format, lib/upload, lib/push,
  hooks useReviews/useBookings/useRegions, NotificationsContext, AuthContext register(phone+role).

### F3 ✅ F4 ✅ F8 ✅ (commit 99d0b72)
- ProviderCard redesign (row+tile, soya, masofa, memo). NotificationsBell.
- Home: discovery + top-rated + qidiruv. Search: region+geo. Kategoriya sahifasi.
- Notifications: in-app + realtime + lokal push. Push regist. (remote push EAS+token kerak — keyin).

### Keyingi: F5 (provayder detali — galereya/xarita/sharhlar/share)
