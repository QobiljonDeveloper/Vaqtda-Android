// Widget snapshot'ni AsyncStorage'ga yozish/o'qish. Task handler (headless) ham,
// ilova ham shu yagona kalitdan foydalanadi.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { EMPTY_SNAPSHOT, type WidgetSnapshot } from "./types";

const KEY = "widget_snapshot_v1";

export async function readSnapshot(): Promise<WidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_SNAPSHOT };
    const parsed = JSON.parse(raw);
    // Yetishmayotgan maydonlarni default bilan to'ldiramiz (versiya farqiga bardosh).
    return { ...EMPTY_SNAPSHOT, ...parsed };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

export async function writeSnapshot(snap: WidgetSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    /* yozib bo'lmasa — widget eski snapshot bilan ishlayveradi */
  }
}
