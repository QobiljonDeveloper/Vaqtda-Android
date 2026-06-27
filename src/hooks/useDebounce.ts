import { useEffect, useState } from "react";

/** Qiymatni kechiktiradi — har bosishda emas, to'xtagandan so'ng so'rov yuboriladi. */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
