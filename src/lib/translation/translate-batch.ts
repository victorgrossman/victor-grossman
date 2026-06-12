import { translateWithDeepL, TranslationUnavailableError } from "./deepl";
import { detectLang } from "./detect-lang";
import { translateManyWithMyMemory } from "./fallback-translate";
import type { SiteLang } from "./types";

export function isDeepLConfigured(): boolean {
  return Boolean(process.env.DEEPL_API_KEY?.trim());
}

export async function translateTextBatch(
  texts: string[],
  targetLang: SiteLang,
  options?: { html?: boolean; sourceLang?: SiteLang },
): Promise<string[]> {
  if (texts.every((t) => !t.trim())) return texts;

  const sourceLang =
    options?.sourceLang ?? detectLang(texts.find((t) => t.trim()) ?? "");

  if (isDeepLConfigured()) {
    try {
      return await translateWithDeepL(texts, targetLang, {
        html: options?.html,
        sourceLang,
      });
    } catch (err) {
      if (!(err instanceof TranslationUnavailableError)) throw err;
    }
  }

  const plain = texts.map((t) =>
    options?.html ? t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : t,
  );
  return translateManyWithMyMemory(plain, targetLang, sourceLang);
}
