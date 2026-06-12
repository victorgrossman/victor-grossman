import type {
  ContentTranslationField,
  ContentTranslationType,
  SiteLang,
  TranslationMap,
} from "./types";
import { translationKey } from "./types";

export function isInvalidStoredTranslation(text: string): boolean {
  const upper = text.toUpperCase();
  return (
    upper.includes("QUERY LENGTH LIMIT EXCEEDED") ||
    upper.includes("MAX ALLOWED QUERY") ||
    upper.includes("MYMEMORY WARNING")
  );
}

export function plainExcerpt(text: string, max = 320): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function pickTranslatedText(
  contentType: ContentTranslationType,
  contentId: string,
  field: ContentTranslationField,
  original: string,
  _lang: SiteLang,
  map: TranslationMap,
): string {
  const key = translationKey(contentType, contentId, field);
  const translated = map[key];
  if (
    translated?.trim() &&
    !isInvalidStoredTranslation(translated)
  ) {
    return translated;
  }
  return original;
}
