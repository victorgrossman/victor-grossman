"use server";

import { translateEnToDe } from "@/lib/translation/translate-en-de";

export async function autoTranslateBulletinFields(title: string, content: string) {
  try {
    const [title_de, content_de] = await Promise.all([
      title.trim() ? translateEnToDe(title) : Promise.resolve(""),
      content.trim() ? translateEnToDe(content) : Promise.resolve(""),
    ]);
    return { ok: true as const, title_de, content_de };
  } catch {
    return {
      ok: false as const,
      message: "Translation failed. Try again in a moment.",
    };
  }
}
