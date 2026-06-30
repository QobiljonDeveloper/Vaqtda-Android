/**
 * AI imlo to'g'irlash (spelling correction) — to'g'ridan-to'g'ri Google Gemini API.
 *
 * Avval xAI (Grok) ishlatilgan edi, lekin grok-2 modellari o'chirildi va hisob
 * krediti tugadi. Endi Gemini bepul tier'iga o'tdik (katta kvota, internet kerak).
 *
 * ⚠️ Kalit EXPO_PUBLIC_ orqali bundlega tushadi (APK dekompilyatsiya qilinsa
 * ko'rinadi). Bu — Edge Function ishlatmaslik tanlovining narxi. Kalitni faqat
 * Generative Language API'ga cheklang (Google Cloud konsolida) va kvota qo'ying.
 *
 * FAIL OPEN: har qanday xato/timeout/kalitsiz holatda xom so'rov qaytadi —
 * shu sabab qidiruv har doim ishlaydi. Bu funksiya HECH QACHON throw qilmaydi.
 */

const AI_TIMEOUT_MS = 4000;
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

export interface SmartCorrectResult {
  /** AI to'g'irlagan termin (xato bo'lsa = raw). Doim qidiruvga shu beriladi. */
  corrected: string;
  /** Foydalanuvchi kiritgan xom matn (TextInput'da ko'rinib turadi). */
  raw: string;
}

/**
 * So'rovni AI bilan to'g'irlaydi. Hech qachon throw qilmaydi.
 * @param query foydalanuvchi kiritgan xom matn
 */
export async function smartCorrect(query: string): Promise<SmartCorrectResult> {
  const raw = (query ?? "").trim();

  // Bo'sh so'rov yoki kalit yo'q bo'lsa — AI'siz xom so'rov.
  if (!raw || !GEMINI_KEY) return { corrected: raw, raw };

  const prompt =
    `You are an expert Uzbek language spelling corrector for a services-booking ` +
    `search box. Fix the spelling of the following search query. Reply ONLY with ` +
    `the corrected word(s) in the LATIN alphabet, lowercase. If it is already ` +
    `correct, return it unchanged. No punctuation, no quotes, no extra words. ` +
    `Query: "${raw}"`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 20 },
        }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

    if (!response.ok) return { corrected: raw, raw };

    const data = await response.json();
    const rawOut: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
    const corrected = rawOut.replace(/[\r\n"']/g, "").trim().toLowerCase();

    // Bo'sh yoki g'alati javob bo'lsa — xom so'rovga qaytamiz.
    if (!corrected || corrected.length === 0 || corrected.length > 100) {
      return { corrected: raw, raw };
    }
    return { corrected, raw };
  } catch {
    // FAIL OPEN — har qanday xato/timeout'da xom so'rov.
    return { corrected: raw, raw };
  }
}
