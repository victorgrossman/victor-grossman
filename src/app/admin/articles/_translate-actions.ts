"use server";

import { detectContentLang } from "@/lib/translation/detect-lang";
import {
  translateDeToEn,
  translateEnToDe,
} from "@/lib/translation/translate-text";

export async function autoTranslateArticleFields(
  title: string,
  excerpt: string,
  content: string,
) {
  try {
    const sourceLang = detectContentLang(`${title}\n${excerpt}\n${content}`);
    const translate =
      sourceLang === "de" ? translateDeToEn : translateEnToDe;

    const [title_de, excerpt_de, content_de] = await Promise.all([
      title.trim() ? translate(title) : Promise.resolve(""),
      excerpt.trim() ? translate(excerpt) : Promise.resolve(""),
      content.trim() ? translate(content) : Promise.resolve(""),
    ]);
    return { ok: true as const, title_de, excerpt_de, content_de };
  } catch {
    return {
      ok: false as const,
      message: "Translation failed. Try again in a moment.",
    };
  }
}
