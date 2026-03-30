/**
 * Lists ImageKit files under cms/books (or IMAGEKIT_CMS_ROOT/books) and removes
 * any file whose delivery URL is not referenced by a row in public.books.image_url.
 *
 * Use after fixing scrape-books (dedupe) to clean old `*_randomId.jpg` uploads.
 *
 * Env: .env.local — NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_CMS_ROOT
 *
 *   node scripts/prune-imagekit-books.mjs           # dry-run: print orphans only
 *   node scripts/prune-imagekit-books.mjs --execute # delete orphans
 */

import ImageKit from "@imagekit/nodejs"
import { readFileSync, existsSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

import { imageKitCmsFolder } from "./lib/imagekit-cms-folder.mjs"

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

function normalizeUrl(url) {
  try {
    const u = new URL(url)
    if (!u.hostname.endsWith("imagekit.io")) return ""
    return `${u.origin}${u.pathname}`
  } catch {
    return ""
  }
}

async function fetchAllBooksImageUrls(supabaseUrl, key) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/books?select=image_url&limit=5000`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  )
  if (!res.ok) throw new Error(await res.text())
  const rows = await res.json()
  const out = new Set()
  for (const r of rows || []) {
    const n = normalizeUrl(r.image_url ?? "")
    if (n) out.add(n)
  }
  return out
}

async function listAllFilesInFolder(ik, listPath) {
  const all = []
  let skip = 0
  const limit = 1000
  for (;;) {
    const list = await ik.assets.list({
      path: listPath,
      type: "file",
      limit,
      skip,
    })
    const items = Array.isArray(list) ? list : []
    for (const item of items) {
      if (item && typeof item === "object" && "fileId" in item && item.fileId) {
        all.push(item)
      }
    }
    if (items.length < limit) break
    skip += limit
  }
  return all
}

async function main() {
  const execute = process.argv.includes("--execute")
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim()

  if (!supabaseUrl || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
    process.exit(1)
  }
  if (!privateKey) {
    console.error("Missing IMAGEKIT_PRIVATE_KEY.")
    process.exit(1)
  }

  const folder = imageKitCmsFolder("books").replace(/^\/+|\/+$/g, "")
  const listPath = `/${folder}/`

  console.log(`Books folder in ImageKit: ${listPath}`)
  console.log("Loading book image_url set from Supabase…")

  const keep = await fetchAllBooksImageUrls(supabaseUrl, key)
  console.log(`Keeping ${keep.size} URL(s) referenced by books.\n`)

  const ik = new ImageKit({ privateKey })
  const files = await listAllFilesInFolder(ik, listPath)
  console.log(`Found ${files.length} file(s) in ImageKit under ${listPath}\n`)

  const orphans = []
  for (const f of files) {
    const u = f.url ? normalizeUrl(String(f.url)) : ""
    if (!u || !keep.has(u)) {
      orphans.push({ fileId: f.fileId, name: f.name, url: f.url })
    }
  }

  if (!orphans.length) {
    console.log("No orphan files (all match a book image_url).")
    return
  }

  console.log(execute ? "Deleting orphans:" : "Orphans (dry-run, pass --execute to delete):")
  for (const o of orphans) {
    console.log(`  ${o.name ?? o.fileId}\n    ${o.url ?? ""}`)
    if (execute && o.fileId) {
      try {
        await ik.files.delete(o.fileId)
        console.log("    → deleted")
      } catch (e) {
        console.log(`    → error: ${e?.message ?? e}`)
      }
    }
  }

  if (!execute) {
    console.log(`\n${orphans.length} orphan(s). Re-run with --execute to remove them.`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
