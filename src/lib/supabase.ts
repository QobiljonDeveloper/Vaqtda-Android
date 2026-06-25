import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Web'dagi createBrowserClient o'rniga — RN uchun AsyncStorage bilan sessiya saqlanadi.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // RN'da URL orqali sessiya yo'q (faqat web OAuth redirect uchun kerak).
    detectSessionInUrl: false,
  },
});

// Ilova old planda bo'lsa tokenni avto-yangilab turamiz, fon rejimida to'xtatamiz.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
