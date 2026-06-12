/**
 * Backfill German translations for articles and bulletins into content_translations.
 * Uses google-translate-api-x (no API key). Public site reads from DB only.
 *
 * Env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/backfill-german-translations.mjs
 *   node scripts/backfill-german-translations.mjs --limit=10
 *   node scripts/backfill-german-translations.mjs --type=bulletin
 *   node scripts/backfill-german-translations.mjs --only-missing --count=23
 *   node scripts/backfill-german-translations.mjs --force
 */

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import translate from "google-translate-api-x";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const p = join(__dirname, "..", ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const countArg = args.find((a) => a.startsWith("--count="));
const typeArg = args.find((a) => a.startsWith("--type="));
const force = args.includes("--force");
const onlyMissing = args.includes("--only-missing");
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const translateCount = countArg ? Number(countArg.split("=")[1]) : Infinity;
const onlyType = typeArg ? typeArg.split("=")[1] : null;

const DELAY_MS = 800;
const CHUNK_SIZE = 3500;
const CHUNK_DELAY_MS = 600;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hashText(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

function plainExcerpt(text, max = 320) {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function isInvalidTranslation(text) {
  const upper = (text ?? "").toUpperCase();
  return (
    upper.includes("QUERY LENGTH LIMIT EXCEEDED") ||
    upper.includes("MAX ALLOWED QUERY") ||
    upper.includes("MYMEMORY WARNING")
  );
}

function splitForTranslation(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= CHUNK_SIZE) return [normalized];

  const chunks = [];
  const paragraphs = normalized.split(/\n{2,}/);
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= CHUNK_SIZE) {
      current = next;
      continue;
    }
    if (current) {
      chunks.push(current);
      current = "";
    }
    if (paragraph.length <= CHUNK_SIZE) {
      current = paragraph;
      continue;
    }
    for (let i = 0; i < paragraph.length; i += CHUNK_SIZE) {
      chunks.push(paragraph.slice(i, i + CHUNK_SIZE));
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function detectContentLang(text) {
  const sample = text.slice(0, 2000).toLowerCase();
  const german = (sample.match(/\b(der|die|das|und|ist|ein|eine|mit|für|auf|nicht|auch|von|dem|den|des|sich|war|wurde|nach|bei|am|im)\b/g) ?? []).length;
  const english = (sample.match(/\b(the|and|is|are|was|were|with|for|not|also|from|that|this|have|has|had|but|they)\b/g) ?? []).length;
  return german > english ? "de" : "en";
}

async function translateChunk(text, from, to) {
  const result = await translate(text, {
    from,
    to,
    forceBatch: false,
    fallbackBatch: true,
  });
  return result.text;
}

async function translateText(text, from, to) {
  if (from === to) return (text ?? "").trim();
  const chunks = splitForTranslation(text ?? "");
  if (chunks.length === 0) return "";

  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    parts.push(await translateChunk(chunks[i], from, to));
    if (i < chunks.length - 1) await sleep(CHUNK_DELAY_MS);
  }
  return parts.join("\n\n");
}

async function fetchExistingMap(supabase, contentType, targetLang) {
  const { data, error } = await supabase
    .from("content_translations")
    .select("content_id,field_name,source_hash,translated_text")
    .eq("content_type", contentType)
    .eq("target_lang", targetLang);

  if (error) throw error;

  const map = new Map();
  for (const row of data ?? []) {
    const key = `${row.content_id}:${row.field_name}`;
    map.set(key, row);
  }
  return map;
}

async function upsertField(supabase, contentType, contentId, fieldName, targetLang, source, translated) {
  const { error } = await supabase.from("content_translations").upsert(
    {
      content_type: contentType,
      content_id: contentId,
      field_name: fieldName,
      target_lang: targetLang,
      source_hash: hashText(source),
      translated_text: translated,
    },
    { onConflict: "content_type,content_id,field_name,target_lang" },
  );
  if (error) throw error;
}

async function processBulletins(supabase) {
  const { data, error } = await supabase
    .from("bulletins")
    .select("id,title,content")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const existing = await fetchExistingMap(supabase, "bulletin", "de");
  let processed = 0;
  let saved = 0;
  let newlyTranslated = 0;

  function bulletinHasGerman(rowId) {
    const title = existing.get(`${rowId}:title`);
    const content = existing.get(`${rowId}:content`);
    return (
      content?.translated_text?.trim() &&
      !isInvalidTranslation(content.translated_text) &&
      title?.translated_text?.trim() &&
      !isInvalidTranslation(title.translated_text)
    );
  }

  for (const row of data ?? []) {
    if (processed >= limit) break;
    if (onlyMissing && bulletinHasGerman(row.id)) continue;
    if (onlyMissing && newlyTranslated >= translateCount) break;
    processed++;

    let bulletinUpdated = false;
    const fields = [
      { name: "title", source: row.title ?? "" },
      { name: "content", source: row.content ?? "" },
    ];

    let contentDe = existing.get(`${row.id}:content`)?.translated_text ?? "";

    for (const field of fields) {
      if (!field.source.trim()) continue;
      const key = `${row.id}:${field.name}`;
      const prev = existing.get(key);
      const sourceHash = hashText(field.source);

      if (
        !force &&
        prev?.source_hash === sourceHash &&
        prev.translated_text?.trim() &&
        !isInvalidTranslation(prev.translated_text)
      ) {
        if (field.name === "content") contentDe = prev.translated_text;
        continue;
      }

      console.log(`[bulletin ${row.id}] translating ${field.name}…`);
      let de = "";
      try {
        de = await translateText(field.source, "en", "de");
      } catch (err) {
        console.warn(`  failed ${field.name}:`, err.message ?? err);
        continue;
      }
      if (!de.trim() || isInvalidTranslation(de)) {
        console.warn(`  skipped invalid ${field.name}`);
        continue;
      }
      await upsertField(supabase, "bulletin", row.id, field.name, "de", field.source, de);
      if (field.name === "content") contentDe = de;
      saved++;
      bulletinUpdated = true;
      await sleep(DELAY_MS);
    }

    const contentSource = row.content ?? "";
    const excerptPrev = existing.get(`${row.id}:excerpt`);
    const needsExcerpt =
      force ||
      !excerptPrev ||
      excerptPrev.source_hash !== hashText(plainExcerpt(contentSource)) ||
      isInvalidTranslation(excerptPrev.translated_text ?? "");

    if (contentSource.trim() && needsExcerpt) {
      let excerptDe = contentDe;
      if (!excerptDe?.trim() || isInvalidTranslation(excerptDe)) {
        excerptDe = await translateText(plainExcerpt(contentSource), "en", "de");
        await sleep(DELAY_MS);
      }
      if (excerptDe?.trim() && !isInvalidTranslation(excerptDe)) {
        await upsertField(
          supabase,
          "bulletin",
          row.id,
          "excerpt",
          "de",
          plainExcerpt(contentSource),
          plainExcerpt(excerptDe),
        );
        saved++;
        bulletinUpdated = true;
      }
    }

    if (bulletinUpdated) newlyTranslated++;
  }

  return { processed, saved, newlyTranslated };
}

async function processArticles(supabase) {
  const { data, error } = await supabase
    .from("articles")
    .select("id,title,excerpt,content")
    .order("created_at", { ascending: true });

  if (error) throw error;

  let processed = 0;
  let saved = 0;

  for (const row of data ?? []) {
    if (processed >= limit) break;
    processed++;

    const sourceLang = detectContentLang(
      `${row.title ?? ""}\n${row.excerpt ?? ""}\n${row.content ?? ""}`,
    );
    const targetLang = sourceLang === "de" ? "en" : "de";
    const existing = await fetchExistingMap(supabase, "article", targetLang);

    const fields = [
      { name: "title", source: row.title ?? "" },
      { name: "excerpt", source: row.excerpt ?? "" },
      { name: "content", source: row.content ?? "" },
    ];

    for (const field of fields) {
      if (!field.source.trim()) continue;
      const key = `${row.id}:${field.name}`;
      const prev = existing.get(key);
      const sourceHash = hashText(field.source);

      if (
        !force &&
        prev?.source_hash === sourceHash &&
        prev.translated_text?.trim() &&
        !isInvalidTranslation(prev.translated_text)
      ) {
        continue;
      }

      console.log(`[article ${row.id}] ${sourceLang}→${targetLang} ${field.name}…`);
      let translated = "";
      try {
        translated = await translateText(field.source, sourceLang, targetLang);
      } catch (err) {
        console.warn(`  failed ${field.name}:`, err.message ?? err);
        continue;
      }
      if (!translated.trim() || isInvalidTranslation(translated)) {
        console.warn(`  skipped invalid ${field.name}`);
        continue;
      }
      await upsertField(
        supabase,
        "article",
        row.id,
        field.name,
        targetLang,
        field.source,
        translated,
      );
      saved++;
      await sleep(DELAY_MS);
    }
  }

  return { processed, saved };
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let totalProcessed = 0;
  let totalSaved = 0;

  if (!onlyType || onlyType === "bulletin") {
    const { processed, saved, newlyTranslated } = await processBulletins(supabase);
    totalProcessed += processed;
    totalSaved += saved;
    console.log(
      `Bulletins: ${processed} rows scanned, ${saved} fields saved, ${newlyTranslated ?? 0} bulletins newly translated.`,
    );
  }

  if (!onlyType || onlyType === "article") {
    const { processed, saved } = await processArticles(supabase);
    totalProcessed += processed;
    totalSaved += saved;
    console.log(`Articles: ${processed} rows scanned, ${saved} fields saved.`);
  }

  console.log(`Done. ${totalSaved} translation fields written.`);
}

main().catch((err) => {
  console.error("Backfill stopped:", err.message ?? err);
  process.exit(1);
});
