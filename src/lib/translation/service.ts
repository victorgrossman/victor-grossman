import { createClient } from "@supabase/supabase-js";

import { detectLang, needsTranslation } from "./detect-lang";
import { hashText } from "./hash";
import { translateTextBatch } from "./translate-batch";
import type {
  TranslationFieldInput,
  TranslationRequest,
  TranslationResultMap,
} from "./types";
import { translationKey } from "./types";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase credentials for translation cache.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type CacheRow = {
  content_type: string;
  content_id: string;
  field_name: string;
  target_lang: string;
  source_hash: string;
  translated_text: string;
};

export async function translateFields(
  request: TranslationRequest,
): Promise<TranslationResultMap> {
  const { targetLang, fields } = request;
  const result: TranslationResultMap = {};

  const pending: {
    input: TranslationFieldInput;
    key: string;
    hash: string;
  }[] = [];

  for (const field of fields) {
    const key = translationKey(field.contentType, field.contentId, field.field);
    const text = field.text ?? "";

    if (!text.trim() || !needsTranslation(text, targetLang)) {
      result[key] = text;
      continue;
    }

    pending.push({ input: field, key, hash: hashText(text) });
  }

  if (pending.length === 0) return result;

  let cachedRows: CacheRow[] = [];
  try {
    const supabase = supabaseAdmin();
    const contentIds = [...new Set(pending.map((p) => p.input.contentId))];
    const contentTypes = [...new Set(pending.map((p) => p.input.contentType))];

    const { data, error: cacheError } = await supabase
      .from("content_translations")
      .select(
        "content_type,content_id,field_name,target_lang,source_hash,translated_text",
      )
      .eq("target_lang", targetLang)
      .in("content_type", contentTypes)
      .in("content_id", contentIds);

    if (cacheError) {
      console.error("Translation cache read failed:", cacheError.message);
    } else {
      cachedRows = (data ?? []) as CacheRow[];
    }
  } catch (err) {
    console.error("Translation cache unavailable:", err);
  }

  const cache = new Map<string, string>();
  for (const row of cachedRows) {
    cache.set(
      translationKey(
        row.content_type as TranslationFieldInput["contentType"],
        row.content_id,
        row.field_name as TranslationFieldInput["field"],
      ),
      row.translated_text,
    );
  }

  const cacheMeta = new Map<string, string>();
  for (const row of cachedRows) {
    cacheMeta.set(
      `${row.content_type}:${row.content_id}:${row.field_name}`,
      row.source_hash,
    );
  }

  const toTranslate: typeof pending = [];

  for (const item of pending) {
    const cached = cache.get(item.key);
    const cachedHash = cacheMeta.get(
      `${item.input.contentType}:${item.input.contentId}:${item.input.field}`,
    );
    if (cached && cachedHash === item.hash) {
      result[item.key] = cached;
    } else {
      toTranslate.push(item);
    }
  }

  if (toTranslate.length === 0) return result;

  const groups: { html: boolean; items: typeof toTranslate }[] = [
    { html: false, items: toTranslate.filter((i) => i.input.format !== "html") },
    { html: true, items: toTranslate.filter((i) => i.input.format === "html") },
  ].filter((group) => group.items.length > 0);

  try {
    for (const group of groups) {
      const translatedTexts = await translateTextBatch(
        group.items.map((item) => item.input.text),
        targetLang,
        {
          html: group.html,
          sourceLang: detectLang(group.items[0]?.input.text ?? ""),
        },
      );

      group.items.forEach((item, index) => {
        const translated = translatedTexts[index] ?? item.input.text;
        result[item.key] = translated;
      });
    }

    const upsertRows = toTranslate.map((item) => ({
      content_type: item.input.contentType,
      content_id: item.input.contentId,
      field_name: item.input.field,
      target_lang: targetLang,
      source_hash: item.hash,
      translated_text: result[item.key] ?? item.input.text,
    }));

    try {
      const supabase = supabaseAdmin();
      const { error: upsertError } = await supabase
        .from("content_translations")
        .upsert(upsertRows, {
          onConflict: "content_type,content_id,field_name,target_lang",
        });

      if (upsertError) {
        console.error("Translation cache write failed:", upsertError.message);
      }
    } catch (err) {
      console.error("Translation cache write skipped:", err);
    }
  } catch (err) {
    console.error("Translation failed:", err);
    for (const item of toTranslate) {
      result[item.key] = item.input.text;
    }
  }

  return result;
}

export function isTranslationEnabled(): boolean {
  return true;
}
