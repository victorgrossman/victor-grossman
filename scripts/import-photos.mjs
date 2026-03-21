/**
 * Pulls images from WordPress.com posts (Berlin Bulletin by default), downloads each,
 * compresses with sharp, uploads to ImageKit under /cms/photos, inserts into Supabase.
 *
 * Prerequisites: sharp (already in package.json), network access.
 *
 * Env (from .env.local or environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  — required for inserts (RLS: only authenticated role may write)
 *   IMAGEKIT_PRIVATE_KEY
 *   IMAGEKIT_PUBLIC_KEY        — optional; upload uses Basic auth with private key only
 *
 * Usage:
 *   node scripts/import-photos.mjs
 *   node scripts/import-photos.mjs --dry-run
 *   node scripts/import-photos.mjs --max=20
 *   node scripts/import-photos.mjs --no-db   # upload to ImageKit only; print SQL lines for Supabase
 *   WORDPRESS_SITE=victorgrossmansberlinbulletin.wordpress.com node scripts/import-photos.mjs
 */

import sharp from "sharp";
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
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;

/** WordPress.com site host, e.g. victorgrossmansberlinbulletin.wordpress.com */
const WORDPRESS_SITE =
  process.env.WORDPRESS_SITE || "victorgrossmansberlinbulletin.wordpress.com";

const POSTS_PER_PAGE = 20;

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const noDb = process.argv.includes("--no-db");
  let max = Infinity;
  const maxArg = process.argv.find((a) => a.startsWith("--max="));
  if (maxArg) {
    const n = parseInt(maxArg.split("=")[1], 10);
    if (!Number.isNaN(n)) max = n;
  }
  return { dryRun, noDb, max };
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Normalize for deduping: strip query + hash */
function canonicalImageUrl(url) {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.href;
  } catch {
    return url.split("?")[0].split("#")[0];
  }
}

function shouldIncludeImageUrl(url, { allowAnyHost = false } = {}) {
  const lower = url.toLowerCase();
  if (
    lower.includes("gravatar.com") ||
    lower.includes("emoji") ||
    lower.includes("/wp-includes/") ||
    lower.includes("s.w.org") ||
    lower.includes("pixel.wp.com") ||
    lower.includes("stats.wp.com") ||
    lower.includes("1x1") ||
    lower.includes("spacer")
  ) {
    return false;
  }
  if (!allowAnyHost && !lower.includes("/wp-content/uploads/")) return false;
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
}

/**
 * @param {string} html
 * @returns {string[]}
 */
function extractImageUrlsFromContent(html) {
  const found = new Map(); // canonical -> best url (prefer without size query)

  const add = (raw) => {
    const decoded = decodeHtmlEntities(raw.trim());
    if (!decoded.startsWith("http")) return;
    if (!shouldIncludeImageUrl(decoded, { allowAnyHost: false })) return;
    const key = canonicalImageUrl(decoded);
    const prev = found.get(key);
    if (!prev || decoded.length < prev.length) found.set(key, decoded);
  };

  let m;
  const reOrig = /data-orig-file="([^"]+)"/gi;
  while ((m = reOrig.exec(html))) add(m[1]);

  const reLarge = /data-large-file="([^"]+)"/gi;
  while ((m = reLarge.exec(html))) add(m[1]);

  const reSrc = /<img[^>]+src="([^"]+)"/gi;
  while ((m = reSrc.exec(html))) add(m[1]);

  return [...found.values()];
}

function stripTags(html) {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

/**
 * @param {string} postTitle plain text
 * @param {number} index 1-based
 * @param {number} total
 */
function photoTitle(postTitle, index, total) {
  const base = postTitle.slice(0, 200) || "Photo";
  if (total <= 1) return base;
  return `${base} (${index}/${total})`;
}

function escapeSqlString(s) {
  return s.replace(/'/g, "''");
}

async function fetchAllPosts() {
  const all = [];
  let offset = 0;
  const base = `https://public-api.wordpress.com/rest/v1.1/sites/${encodeURIComponent(
    WORDPRESS_SITE,
  )}/posts/`;

  for (;;) {
    const url = `${base}?number=${POSTS_PER_PAGE}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WordPress API ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const posts = data.posts || [];
    if (!posts.length) break;
    all.push(...posts);
    offset += posts.length;
    if (posts.length < POSTS_PER_PAGE) break;
  }
  return all;
}

async function downloadAndCompress(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  const raw = Buffer.from(arrayBuf);
  const compressed = await sharp(raw)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return compressed;
}

async function uploadToImageKit(buffer, fileName) {
  const auth = Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString("base64");
  const formData = new FormData();
  formData.append("file", new Blob([buffer]), fileName);
  formData.append("fileName", fileName);
  formData.append("folder", "/cms/photos");

  const res = await fetch("https://upload.imagekit.io/api/v2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ImageKit upload failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.url;
}

async function insertIntoSupabase(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/photos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase insert error: ${res.status} ${text}`);
  }
}

async function main() {
  const { dryRun, noDb, max } = parseArgs();

  if ((!SUPABASE_URL || !SUPABASE_KEY) && !dryRun && !noDb) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key. Set SUPABASE_SERVICE_ROLE_KEY in .env.local for inserts, or use --no-db to skip DB and print SQL.",
    );
    process.exit(1);
  }
  if (!IMAGEKIT_PRIVATE_KEY && !dryRun) {
    console.error("Missing IMAGEKIT_PRIVATE_KEY.");
    process.exit(1);
  }

  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !dryRun &&
    !noDb
  ) {
    console.warn(
      "\n⚠️  Using anon key: RLS will block inserts on photos. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (never commit it), or use --no-db to print INSERT lines after ImageKit upload.\n",
    );
  }

  console.log("=== Photos import ===\n");
  console.log(`Site: ${WORDPRESS_SITE}`);
  console.log(
    `Dry run: ${dryRun}, no DB: ${noDb}, max items: ${max === Infinity ? "all" : max}\n`,
  );

  const posts = await fetchAllPosts();
  console.log(`Fetched ${posts.length} posts.\n`);

  /** @type {{ title: string, sourceUrl: string }[]} */
  const items = [];
  const seenCanonical = new Set();

  for (const post of posts) {
    const postTitle = stripTags(post.title || "");
    const urls = extractImageUrlsFromContent(post.content || "");
    const newForPost = [];
    for (const sourceUrl of urls) {
      const key = canonicalImageUrl(sourceUrl);
      if (seenCanonical.has(key)) continue;
      seenCanonical.add(key);
      newForPost.push(sourceUrl);
    }
    newForPost.forEach((sourceUrl, j) => {
      items.push({
        title: photoTitle(postTitle, j + 1, newForPost.length),
        sourceUrl,
      });
    });
  }

  const extraPath = join(__dirname, "photos-sources.json");
  if (existsSync(extraPath)) {
    try {
      const extra = JSON.parse(readFileSync(extraPath, "utf8"));
      if (!Array.isArray(extra)) throw new Error("expected JSON array");
      for (const row of extra) {
        if (!row?.sourceUrl || !row?.title) continue;
        const sourceUrl = String(row.sourceUrl).trim();
        const title = String(row.title).trim();
        if (!shouldIncludeImageUrl(sourceUrl, { allowAnyHost: true })) {
          console.warn(`Skipping (not a supported image URL): ${sourceUrl}`);
          continue;
        }
        const key = canonicalImageUrl(sourceUrl);
        if (seenCanonical.has(key)) continue;
        seenCanonical.add(key);
        items.push({ title: title.slice(0, 200), sourceUrl });
      }
      console.log(`Merged entries from scripts/photos-sources.json\n`);
    } catch (e) {
      console.error(`Could not read photos-sources.json: ${e.message}`);
    }
  }

  console.log(`Unique images to process: ${items.length}\n`);

  let done = 0;
  for (let i = 0; i < items.length && done < max; i++) {
    const { title, sourceUrl } = items[i];
    console.log(`[${done + 1}] ${title}`);
    console.log(`    ${sourceUrl}`);

    if (dryRun) {
      done++;
      continue;
    }

    try {
      const compressed = await downloadAndCompress(sourceUrl);
      const baseName =
        sourceUrl.split("/").pop()?.replace(/\?.*$/, "") || `photo-${i}.jpg`;
      const fileName = baseName.replace(/\.(png|gif|webp)$/i, ".jpg");
      const imagekitUrl = await uploadToImageKit(compressed, fileName);
      console.log(`    ImageKit: ${imagekitUrl}`);

      if (noDb) {
        console.log(
          `    SQL:  ('${escapeSqlString(title)}', '${escapeSqlString(imagekitUrl)}'),`,
        );
        console.log("");
      } else {
        await insertIntoSupabase({ title, image_url: imagekitUrl });
        console.log("    Supabase: inserted.\n");
      }
    } catch (err) {
      console.error(`    Error: ${err.message}\n`);
    }
    done++;
  }

  if (noDb && !dryRun) {
    console.log(
      "\n-- Wrap the lines above in: INSERT INTO public.photos (title, image_url) VALUES ... ;",
    );
  }
  console.log(dryRun ? "Dry run finished." : "Done.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
