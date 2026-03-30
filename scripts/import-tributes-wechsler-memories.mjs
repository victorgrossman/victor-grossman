/**
 * Imports "Memories" from the public memorial site (wechsler-grossman.com)
 * by reading its Supabase `memories` table, and upserts them into the CMS
 * `tributes` table so they appear in `/admin/tributes`.
 *
 * This is not fragile HTML scraping — the website itself reads Supabase, so we
 * pull the same source-of-truth.
 *
 * Requires running: supabase/migrations/0002_tributes_import_fields.sql
 *
 * Env (from .env.local or shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   — required for inserts/upserts (RLS)
 *
 * Optional overrides:
 *   SOURCE_SUPABASE_URL
 *   SOURCE_SUPABASE_ANON_KEY
 *
 * Usage:
 *   node scripts/import-tributes-wechsler-memories.mjs
 *   node scripts/import-tributes-wechsler-memories.mjs --dry-run
 *   node scripts/import-tributes-wechsler-memories.mjs --max=50
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

// Extracted from https://wechsler-grossman.com/ JS bundle (public anon key).
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

async function fetchAllMemories(max) {
  const source = createClient(SOURCE_SUPABASE_URL, SOURCE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const pageSize = 1000
  let from = 0
  const all = []

  for (;;) {
    const to = from + pageSize - 1
    const { data, error } = await source
      .from("memories")
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

function mapMemoryToTribute(m) {
  const name = String(m.author ?? "").trim() || "Anonymous"
  const message = String(m.message ?? "").trim()
  const image_url =
    typeof m.image === "string" && !m.image.startsWith("data:")
      ? m.image
      : ""

  // If source has verification, treat verified as approved.
  const status =
    m.is_verified === true ? "approved" : m.is_verified === false ? "pending" : "approved"

  const created_at = typeof m.created_at === "string" ? m.created_at : undefined

  return {
    name,
    message,
    image_url,
    status,
    source: "wechsler-grossman:memories",
    source_key: `wechsler-memories:${m.id}`,
    ...(created_at ? { created_at } : {}),
  }
}

async function upsertTributes(rows) {
  if (!DEST_SUPABASE_URL || !DEST_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (required for RLS writes).",
    )
  }

  const dest = createClient(DEST_SUPABASE_URL, DEST_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const chunkSize = 200
  let done = 0
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { error } = await dest
      .from("tributes")
      .upsert(chunk, { onConflict: "source_key" })
    if (error) throw error
    done += chunk.length
    console.log(`Upserted ${done}/${rows.length}`)
  }
}

async function main() {
  const { dryRun, max } = parseArgs()

  console.log("Fetching memories from source…")
  const memories = await fetchAllMemories(max)
  console.log(`Found ${memories.length} memories.`)

  const tributes = memories
    .map(mapMemoryToTribute)
    .filter((t) => t.message && t.message.length > 0)

  console.log(`Mapped ${tributes.length} tributes.`)
  if (tributes[0]) console.log("Sample:", JSON.stringify(tributes[0], null, 2).slice(0, 600))

  if (dryRun) {
    console.log("Dry run, not writing to DB.")
    return
  }

  console.log("Upserting into CMS tributes…")
  await upsertTributes(tributes)
  console.log("Done.")
}

main().catch((e) => {
  console.error("Import failed:", e?.message ?? e)
  process.exit(1)
})

