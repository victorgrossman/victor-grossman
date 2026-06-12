import {
  translateDeToEn,
  translateEnToDe,
} from "@/lib/translation/translate-text";
import { detectContentLang } from "@/lib/translation/detect-lang";

export type GermanFieldInput = {
  title_de?: string;
  content_de?: string;
  excerpt_de?: string;
};

export async function resolveGermanFields(
  english: { title: string; content: string; excerpt?: string },
  manual: GermanFieldInput,
  options?: { autoTranslate?: boolean },
): Promise<Required<GermanFieldInput>> {
  const auto = options?.autoTranslate !== false;
  const sourceLang = detectContentLang(
    `${english.title}\n${english.excerpt ?? ""}\n${english.content}`,
  );
  const toGerman =
    sourceLang === "en" ? translateEnToDe : async (text: string) => text;

  let title_de = manual.title_de?.trim() ?? "";
  let content_de = manual.content_de?.trim() ?? "";
  let excerpt_de = manual.excerpt_de?.trim() ?? "";

  if (!title_de && auto && english.title.trim()) {
    title_de = await toGerman(english.title);
  }
  if (!content_de && auto && english.content.trim()) {
    content_de = await toGerman(english.content);
  }
  if (!excerpt_de && auto && english.excerpt?.trim()) {
    excerpt_de = await toGerman(english.excerpt);
  }

  return { title_de, content_de, excerpt_de };
}

export async function resolveEnglishFields(
  source: { title: string; content: string; excerpt?: string },
  manual: { title_en?: string; content_en?: string; excerpt_en?: string },
  options?: { autoTranslate?: boolean },
): Promise<{ title_en: string; content_en: string; excerpt_en: string }> {
  const auto = options?.autoTranslate !== false;
  const sourceLang = detectContentLang(
    `${source.title}\n${source.excerpt ?? ""}\n${source.content}`,
  );
  const toEnglish =
    sourceLang === "de" ? translateDeToEn : async (text: string) => text;

  let title_en = manual.title_en?.trim() ?? "";
  let content_en = manual.content_en?.trim() ?? "";
  let excerpt_en = manual.excerpt_en?.trim() ?? "";

  if (!title_en && auto && source.title.trim()) {
    title_en = await toEnglish(source.title);
  }
  if (!content_en && auto && source.content.trim()) {
    content_en = await toEnglish(source.content);
  }
  if (!excerpt_en && auto && source.excerpt?.trim()) {
    excerpt_en = await toEnglish(source.excerpt);
  }

  return { title_en, content_en, excerpt_en };
}
