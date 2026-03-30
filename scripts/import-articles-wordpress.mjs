/**
 * Pulls posts from WordPress.com’s public REST API (same blog as Berlin Bulletin)
 * and upserts into Supabase `articles` — no HTML scraping; stable JSON fields.
 *
 * Requires migration: supabase/migrations/0002_articles_wordpress_import.sql
 *
 * Env (from .env.local or shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   — required for upsert (RLS)
 *
 * Optional:
 *   WORDPRESS_SITE=victorgrossmansberlinbulletin.wordpress.com
 *
 * Usage:
 *   node scripts/import-articles-wordpress.mjs
 *   node scripts/import-articles-wordpress.mjs --dry-run
 *   node scripts/import-articles-wordpress.mjs --max=20
 *   node scripts/import-articles-wordpress.mjs --category=english   # must include this category slug
 *   node scripts/import-articles-wordpress.mjs --exclude-category=berlin-bulletin
 */

import { createClient } from "@supabase/supabase-js";
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

const WP_SITE =
  process.env.WORDPRESS_SITE || "victorgrossmansberlinbulletin.wordpress.com";
const WP_API = `https://public-api.wordpress.com/rest/v1.1/sites/${WP_SITE}/posts/`;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function decodeHtmlEntities(s) {
  if (!s) return "";
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .trim();
}

function stripHtmlToExcerpt(html) {
  if (!html) return "";
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  ).slice(0, 500);
}

function firstImageFromContent(html) {
  if (!html) return "";
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1].split("?")[0] : "";
}

function categoryNames(categories) {
  if (!categories || typeof categories !== "object") return "";
  const names = Object.values(categories)
    .map((c) => (c && c.name ? String(c.name) : ""))
    .filter(Boolean);
  return names.join(", ");
}

function categorySlugs(categories) {
  if (!categories || typeof categories !== "object") return [];
  return Object.values(categories)
    .map((c) => (c && c.slug ? String(c.slug) : ""))
    .filter(Boolean);
}

function authorDisplay(author) {
  if (!author || typeof author !== "object") return "Victor Grossman";
  const fn = author.first_name || "";
  const ln = author.last_name || "";
  const full = `${fn} ${ln}`.trim();
  if (full) return full;
  if (author.name) return String(author.name);
  return "Victor Grossman";
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  let max = Infinity;
  const maxArg = process.argv.find((a) => a.startsWith("--max="));
  if (maxArg) {
    const n = parseInt(maxArg.split("=")[1], 10);
    if (!Number.isNaN(n)) max = n;
  }
  let categoryFilter = "";
  const catArg = process.argv.find((a) => a.startsWith("--category="));
  if (catArg) categoryFilter = catArg.split("=")[1]?.trim() || "";

  let excludeCategory = "";
  const exArg = process.argv.find((a) => a.startsWith("--exclude-category="));
  if (exArg) excludeCategory = exArg.split("=")[1]?.trim() || "";

  return { dryRun, max, categoryFilter, excludeCategory };
}

async function fetchAllPosts() {
  const posts = [];
  let offset = 0;
  const perPage = 100;
  const fields = [
    "ID",
    "title",
    "content",
    "excerpt",
    "date",
    "featured_image",
    "categories",
    "author",
  ].join(",");

  while (true) {
    const url = `${WP_API}?number=${perPage}&offset=${offset}&fields=${encodeURIComponent(fields)}`;
    console.log(`Fetching offset=${offset}…`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`WordPress API error: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const batch = json.posts || [];
    if (batch.length === 0) break;
    posts.push(...batch);
    console.log(
      `  Got ${batch.length} posts (total ${posts.length} / ${json.found ?? "?"})`,
    );
    if (json.found != null && posts.length >= json.found) break;
    offset += perPage;
  }

  return posts;
}

function mapPostToArticleRow(p, { categoryFilter, excludeCategory }) {
  const slugs = categorySlugs(p.categories);
  if (categoryFilter && !slugs.includes(categoryFilter)) return null;
  if (excludeCategory && slugs.includes(excludeCategory)) return null;

  const title = decodeHtmlEntities(
    (p.title || "").replace(/<[^>]+>/g, "").trim(),
  );
  const content = (p.content || "").trim();
  if (!title || !content) return null;

  const excerptHtml = p.excerpt || "";
  const excerpt =
    stripHtmlToExcerpt(excerptHtml) || stripHtmlToExcerpt(content).slice(0, 300);

  const featured =
    typeof p.featured_image === "string" && p.featured_image.length > 0
      ? p.featured_image
      : "";
  const image_url = featured || firstImageFromContent(content) || null;

  const category = categoryNames(p.categories) || null;
  const author = authorDisplay(p.author);
  const created_at = p.date ? new Date(p.date).toISOString() : undefined;

  return {
    wp_post_id: p.ID,
    title,
    excerpt,
    content,
    image_url,
    category,
    author,
    is_published: true,
    ...(created_at ? { created_at } : {}),
  };
}

async function main() {
  const { dryRun, max, categoryFilter, excludeCategory } = parseArgs();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
    );
    process.exit(1);
  }

  console.log(`=== WordPress → articles import (${WP_SITE}) ===\n`);
  if (categoryFilter) console.log(`Filter category slug: ${categoryFilter}`);
  if (excludeCategory) console.log(`Exclude category slug: ${excludeCategory}`);
  if (dryRun) console.log("(dry-run: no database writes)\n");

  const posts = await fetchAllPosts();
  const rows = [];
  for (const p of posts) {
    const row = mapPostToArticleRow(p, { categoryFilter, excludeCategory });
    if (row) rows.push(row);
    if (rows.length >= max) break;
  }

  console.log(`\nMapped ${rows.length} article row(s) (max=${max === Infinity ? "all" : max}).`);
  if (rows[0]) {
    console.log(
      "Sample:",
      JSON.stringify(
        {
          wp_post_id: rows[0].wp_post_id,
          title: rows[0].title,
          category: rows[0].category,
          image_url: rows[0].image_url?.slice?.(0, 80),
        },
        null,
        2,
      ),
    );
  }

  if (dryRun || rows.length === 0) {
    console.log("\nDone (no upsert).");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const chunkSize = 50;
  let done = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("articles")
      .upsert(chunk, { onConflict: "wp_post_id" });
    if (error) {
      console.error("Upsert error:", error.message);
      if (error.message.includes("wp_post_id") || error.code === "42703") {
        console.error(
          "\nDid you run migration 0002_articles_wordpress_import.sql in this Supabase project?",
        );
      }
      process.exit(1);
    }
    done += chunk.length;
    console.log(`Upserted ${done}/${rows.length}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
