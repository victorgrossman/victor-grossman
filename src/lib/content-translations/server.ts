import { createSupabaseServiceClient } from "@/lib/supabase/service";

import { hashText } from "./hash";
import { plainExcerpt } from "./resolve";
import type {
  ContentTranslationField,
  ContentTranslationType,
  SiteLang,
} from "./types";

export type GermanTranslationFields = {
  title_de?: string;
  content_de?: string;
  excerpt_de?: string;
};

export type GermanTranslationMap = Record<string, GermanTranslationFields>;

export function buildGermanTranslationMap(
  rows: {
    content_id: string;
    field_name: string;
    translated_text: string;
  }[],
): GermanTranslationMap {
  const map: GermanTranslationMap = {};

  for (const row of rows) {
    if (!map[row.content_id]) map[row.content_id] = {};
    const field = row.field_name as ContentTranslationField;
    if (field === "title") map[row.content_id].title_de = row.translated_text;
    if (field === "content") map[row.content_id].content_de = row.translated_text;
    if (field === "excerpt") map[row.content_id].excerpt_de = row.translated_text;
  }

  return map;
}

export async function fetchGermanTranslationMap(
  contentType: ContentTranslationType,
): Promise<GermanTranslationMap> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("content_translations")
    .select("content_id,field_name,translated_text")
    .eq("content_type", contentType)
    .eq("target_lang", "de");

  if (error) {
    console.error("fetchGermanTranslationMap:", error.message);
    return {};
  }

  return buildGermanTranslationMap(data ?? []);
}

type FieldInput = {
  source: string;
  text?: string;
};

async function saveTranslationsForLang(
  contentType: ContentTranslationType,
  contentId: string,
  targetLang: SiteLang,
  fields: {
    title?: FieldInput;
    content?: FieldInput;
    excerpt?: FieldInput;
  },
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const upserts: {
    content_type: ContentTranslationType;
    content_id: string;
    field_name: ContentTranslationField;
    target_lang: SiteLang;
    source_hash: string;
    translated_text: string;
  }[] = [];

  const fieldNames: ContentTranslationField[] = ["title", "content", "excerpt"];

  for (const fieldName of fieldNames) {
    const spec = fields[fieldName];
    if (!spec) continue;

    const translated = spec.text?.trim() ?? "";
    if (!translated) {
      await supabase
        .from("content_translations")
        .delete()
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .eq("field_name", fieldName)
        .eq("target_lang", targetLang);
      continue;
    }

    upserts.push({
      content_type: contentType,
      content_id: contentId,
      field_name: fieldName,
      target_lang: targetLang,
      source_hash: hashText(spec.source),
      translated_text: translated,
    });
  }

  if (
    contentType === "bulletin" &&
    targetLang === "de" &&
    fields.content?.text?.trim() &&
    !fields.excerpt?.text?.trim()
  ) {
    const contentTranslated = fields.content.text.trim();
    upserts.push({
      content_type: contentType,
      content_id: contentId,
      field_name: "excerpt",
      target_lang: "de",
      source_hash: hashText(plainExcerpt(fields.content.source)),
      translated_text: plainExcerpt(contentTranslated),
    });
  }

  if (upserts.length === 0) return;

  const { error } = await supabase.from("content_translations").upsert(upserts, {
    onConflict: "content_type,content_id,field_name,target_lang",
  });

  if (error) {
    console.error(`saveTranslationsForLang(${targetLang}):`, error.message);
  }
}

export async function saveGermanTranslations(
  contentType: ContentTranslationType,
  contentId: string,
  fields: {
    title?: { source: string; de?: string };
    content?: { source: string; de?: string };
    excerpt?: { source: string; de?: string };
  },
): Promise<void> {
  return saveTranslationsForLang(contentType, contentId, "de", {
    title: fields.title
      ? { source: fields.title.source, text: fields.title.de }
      : undefined,
    content: fields.content
      ? { source: fields.content.source, text: fields.content.de }
      : undefined,
    excerpt: fields.excerpt
      ? { source: fields.excerpt.source, text: fields.excerpt.de }
      : undefined,
  });
}

export async function saveEnglishTranslations(
  contentType: ContentTranslationType,
  contentId: string,
  fields: {
    title?: { source: string; en?: string };
    content?: { source: string; en?: string };
    excerpt?: { source: string; en?: string };
  },
): Promise<void> {
  return saveTranslationsForLang(contentType, contentId, "en", {
    title: fields.title
      ? { source: fields.title.source, text: fields.title.en }
      : undefined,
    content: fields.content
      ? { source: fields.content.source, text: fields.content.en }
      : undefined,
    excerpt: fields.excerpt
      ? { source: fields.excerpt.source, text: fields.excerpt.en }
      : undefined,
  });
}

export async function deleteGermanTranslations(
  contentType: ContentTranslationType,
  contentId: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("content_translations")
    .delete()
    .eq("content_type", contentType)
    .eq("content_id", contentId);

  if (error) {
    console.error("deleteGermanTranslations:", error.message);
  }
}
