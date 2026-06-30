import { useCallback, useState } from "react";

import { smartCorrect, type SmartCorrectResult } from "@/lib/smartSearch";

/**
 * smartCorrect ustidagi yupqa hook — loading holati bilan.
 * FAIL OPEN: xato bo'lsa ham xom so'rov qaytadi (smartCorrect throw qilmaydi).
 */
export function useSmartSearch() {
  const [correcting, setCorrecting] = useState(false);

  const correct = useCallback(async (query: string): Promise<SmartCorrectResult> => {
    setCorrecting(true);
    try {
      return await smartCorrect(query);
    } finally {
      setCorrecting(false);
    }
  }, []);

  return { correct, correcting };
}
