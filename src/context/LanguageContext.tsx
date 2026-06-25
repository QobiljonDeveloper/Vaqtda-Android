import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { ru } from "@/locales/ru";
import { uz, type TKey } from "@/locales/uz";
import { setLocalizeLang } from "@/lib/localize";

export type Lang = "uz" | "ru";

const DICTS: Record<Lang, Record<TKey, string>> = { uz, ru };
const STORAGE_KEY = "lang";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** Statik UI matni: t("nav.providers"). {name} kabi o'rinlarni vars bilan to'ldiradi. */
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("uz");

  // Saqlangan tilni o'qiymiz (web'dagi cookie o'rniga AsyncStorage).
  useEffect(() => {
    (async () => {
      const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as Lang | null;
      if (saved === "uz" || saved === "ru") {
        setLangState(saved);
        setLocalizeLang(saved);
      }
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setLocalizeLang(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const toggle = useCallback(
    () => setLang(lang === "uz" ? "ru" : "uz"),
    [lang, setLang]
  );

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => {
      let str: string = DICTS[lang][key] ?? uz[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return str;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
