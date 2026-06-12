import type { SupabaseClient } from "@supabase/supabase-js";

import type { SiteLang, TranslationMap } from "./types";
import { translationKey } from "./types";

export async function fetchStoredTranslations(
  client: SupabaseClient,
  targetLang: SiteLang,
): Promise<TranslationMap> {
  const { data, error } = await client
    .from("content_translations")
    .select("content_type,content_id,field_name,translated_text")
    .eq("target_lang", targetLang);

  if (error) {
    console.error("fetchStoredTranslations:", error.message);
    return {};
  }

  const map: TranslationMap = {};
  for (const row of data ?? []) {
    map[
      translationKey(
        row.content_type as "article" | "bulletin",
        row.content_id,
        row.field_name as "title" | "content" | "excerpt",
      )
    ] = row.translated_text;
  }
  return map;
}
