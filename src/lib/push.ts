// Push / lokal bildirishnomalar (expo-notifications).
// Ilova ochiqligida: realtime INSERT'da lokal banner (presentLocal).
// Ilova yopiqligida haqiqiy remote push uchun: EAS projectId + token DB'da
// saqlanishi kerak (DB'ga tegmadik). registerForPush token'ni best-effort qaytaradi.

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

import { Colors } from "@/constants/colors";

// Old planda banner + ovoz + badge ko'rsatamiz (SDK 56 shakli).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Bildirishnoma ruxsatini so'raydi va (iloji bo'lsa) Expo push token qaytaradi. */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: Colors.primary,
    }).catch(() => {});
  }

  // projectId bo'lmasa getExpoPushTokenAsync xato beradi — lokal bildirishnoma baribir ishlaydi.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  if (!projectId) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}

/** Ilova ochiqligida darhol ko'rinadigan lokal banner. */
export async function presentLocal(title: string, body: string, data?: Record<string, unknown>) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body: body || "", data: data ?? {} },
      trigger: null,
    });
  } catch {
    /* jim */
  }
}

// ────────────────────────────────────────────────────────────
// Deep-link: bildirishnoma bosilganda tegishli ekranga o'tish.
// Web NotificationsBell bilan bir xil mantiq:
//   waitlist_slot_open + slug  ->  /provider/<slug>?date=YYYY-MM-DD
//   (o'sha kun avtoselect bo'lishi uchun ?date= beriladi — useProviderBooking ?date= ko'zgusi)
//   boshqa turlar: data.slug bo'lsa provider sahifasiga.
// ────────────────────────────────────────────────────────────

export interface NotificationDeepLinkData {
  slug?: string;
  date?: string;
  [key: string]: unknown;
}

/** data va type'ga qarab marshrut (route) string'ini hisoblaydi yoki null. */
export function routeForNotification(
  type: string | null | undefined,
  data: NotificationDeepLinkData | null | undefined
): string | null {
  const d = data ?? {};
  const slug = typeof d.slug === "string" ? d.slug : undefined;
  const date = typeof d.date === "string" ? d.date : undefined;
  if (!slug) return null;
  if (type === "waitlist_slot_open" && date) {
    return `/provider/${slug}?date=${date}`;
  }
  return `/provider/${slug}`;
}

/** Bildirishnoma bosilganda tegishli ekranga navigatsiya qiladi (mavjud bo'lsa). */
export function openNotification(
  type: string | null | undefined,
  data: NotificationDeepLinkData | null | undefined
) {
  const route = routeForNotification(type, data);
  if (!route) return;
  try {
    router.push(route as never);
  } catch {
    /* navigatsiya tayyor emas — jim o'tamiz */
  }
}

/**
 * OS push/local bildirishnoma bosilishini tinglaydi (background/quit holatdan ham).
 * Tozalash funksiyasini qaytaradi. NotificationsProvider'da chaqiriladi.
 */
export function addNotificationResponseListener(): () => void {
  // Ilova butunlay yopiq turib bosilgan bo'lsa — oxirgi javobni o'qiymiz.
  Notifications.getLastNotificationResponseAsync()
    .then((resp) => {
      if (!resp) return;
      const content = resp.notification.request.content;
      const data = (content.data ?? {}) as NotificationDeepLinkData;
      openNotification((data.type as string) ?? null, data);
    })
    .catch(() => {});

  const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const content = resp.notification.request.content;
    const data = (content.data ?? {}) as NotificationDeepLinkData;
    openNotification((data.type as string) ?? null, data);
  });

  return () => sub.remove();
}
