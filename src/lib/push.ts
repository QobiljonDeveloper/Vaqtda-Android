// Push / lokal bildirishnomalar (expo-notifications).
// Ilova ochiqligida: realtime INSERT'da lokal banner (presentLocal).
// Ilova yopiqligida haqiqiy remote push uchun: EAS projectId + token DB'da
// saqlanishi kerak (DB'ga tegmadik). registerForPush token'ni best-effort qaytaradi.

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
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
