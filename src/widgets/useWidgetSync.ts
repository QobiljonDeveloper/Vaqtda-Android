// Widget snapshot'ni ilova ochilganda va old planga qaytganda yangilaydi.
// _layout ichida mount qilinadi. authKey o'zgarsa (kirish/chiqish) qayta yuradi.

import { useEffect } from "react";
import { AppState } from "react-native";

import { syncWidgets } from "./sync";

export function useWidgetSync(authKey: unknown): void {
  useEffect(() => {
    syncWidgets();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") syncWidgets();
    });
    return () => sub.remove();
  }, [authKey]);
}
