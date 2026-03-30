/**
 * Imports `articles` from the memorial site (wechsler-grossman.com) Supabase
 * into the CMS `articles` table — same pattern as Memories → Tributes.
 *
 * Requires `0001_init.sql` and `0002_articles_wordpress_import.sql` (category, author, is_published, wp_post_id).
 *
 * Env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   SOURCE_SUPABASE_URL
 *   SOURCE_SUPABASE_ANON_KEY
 *
 * Usage:
 *   node scripts/import-articles-wechsler.mjs
 *   node scripts/import-articles-wechsler.mjs --dry-run
 *   node scripts/import-articles-wechsler.mjs --max=50
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const p = join(__dirname, "..", ".env.local")
  if (!existsSync(p)) return
  const raw = readFileSync(p, "utf8")
  for (const line of raw.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

loadEnvLocal()

const DEFAULT_SOURCE_URL = "https://prinomaaszkdknrluweo.supabase.co"
const DEFAULT_SOURCE_ANON_KEY = "sb_publishable_4bHkMDRWSrE5jqR2QLphhw_r-tSsaAJ"

const SOURCE_SUPABASE_URL = process.env.SOURCE_SUPABASE_URL ?? DEFAULT_SOURCE_URL
const SOURCE_SUPABASE_ANON_KEY =
  process.env.SOURCE_SUPABASE_ANON_KEY ?? DEFAULT_SOURCE_ANON_KEY

const DEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const DEST_SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run")
  let max = Infinity
  const maxArg = process.argv.find((a) => a.startsWith("--max="))
  if (maxArg) {
    const n = parseInt(maxArg.split("=")[1], 10)
    if (!Number.isNaN(n)) max = n
  }
  return { dryRun, max }
}

async function fetchAllSourceArticles(max) {
  const source = createClient(SOURCE_SUPABASE_URL, SOURCE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const pageSize = 1000
  let from = 0
  const all = []

  for (;;) {
    const to = from + pageSize - 1
    const { data, error } = await source
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to)
    if (error) throw error
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < pageSize) break
    if (all.length >= max) break
    from += pageSize
  }

  return all.slice(0, max)
}

function mapArticleFull(a) {
  const title = String(a.title ?? "").trim()
  const content = String(a.content ?? "").trim()
  if (!title || !content) return null

  const excerpt = String(a.excerpt ?? "").trim() || null
  let image_url = typeof a.image_url === "string" ? a.image_url.trim() : ""
  if (image_url.startsWith("data:")) image_url = ""

  const row = {
    id: a.id,
    title,
    excerpt,
    content,
    image_url: image_url || null,
    category: a.category != null ? String(a.category) : null,
    author: a.author != null ? String(a.author) : null,
    is_published:
      typeof a.is_published === "boolean" ? a.is_published : true,
    wp_post_id:
      typeof a.wp_post_id === "number" && !Number.isNaN(a.wp_post_id)
        ? a.wp_post_id
        : null,
  }

  if (typeof a.created_at === "string") {
    row.created_at = a.created_at
  }

  return row
}

/** Core columns from 0001_init only (works if extended migration not applied). */
function toCoreRow(full) {
  const { id, title, excerpt, content, image_url, created_at } = full
  return { id, title, excerpt, content, image_url, created_at }
}

async function upsertArticles(rowsFull) {
  if (!DEST_SUPABASE_URL || !DEST_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (required for RLS writes).",
    )
  }

  const dest = createClient(DEST_SUPABASE_URL, DEST_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const chunkSize = 50
  let done = 0
  for (let i = 0; i < rowsFull.length; i += chunkSize) {
    const chunk = rowsFull.slice(i, i + chunkSize)
    let { error } = await dest
      .from("articles")
      .upsert(chunk, { onConflict: "id" })
    if (
      error &&
      (error.message?.includes("wp_post_id") ||
        error.message?.includes("category") ||
        error.message?.includes("schema cache"))
    ) {
      const core = chunk.map(toCoreRow)
      const retry = await dest
        .from("articles")
        .upsert(core, { onConflict: "id" })
      error = retry.error
      if (!error) {
        console.log(
          "Note: upserted with core columns only. Run migration 0002_articles_wordpress_import.sql for category/author/is_published/wp_post_id.",
        )
      }
    }
    if (error) throw error
    done += chunk.length
    console.log(`Upserted ${done}/${rowsFull.length}`)
  }
}

async function main() {
  const { dryRun, max } = parseArgs()

  console.log("Fetching articles from memorial Supabase…")
  const raw = await fetchAllSourceArticles(max)
  console.log(`Found ${raw.length} article row(s).`)

  const rows = raw.map(mapArticleFull).filter(Boolean)
  console.log(`Mapped ${rows.length} article(s).`)
  if (rows[0]) {
    console.log(
      "Sample:",
      JSON.stringify(
        {
          id: rows[0].id,
          title: rows[0].title,
          category: rows[0].category,
          is_published: rows[0].is_published,
        },
        null,
        2,
      ),
    )
  }

  if (dryRun) {
    console.log("Dry run, not writing to DB.")
    return
  }

  if (rows.length === 0) {
    console.log("Nothing to import.")
    return
  }

  console.log("Upserting into CMS articles…")
  await upsertArticles(rows)
  console.log("Done.")
}

main().catch((e) => {
  console.error("Import failed:", e?.message ?? e)
  process.exit(1)
})
