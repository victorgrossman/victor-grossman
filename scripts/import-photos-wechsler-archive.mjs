/**
 * Imports the memorial site photo gallery (https://wechsler-grossman.com/ → “Fotos” / archive)
 * into the CMS: reads the **same** Supabase table the public site uses (`archive_photos`),
 * deletes existing files under ImageKit `/<IMAGEKIT_CMS_ROOT>/photos`, clears `public.photos`,
 * then re-uploads each image to ImageKit and inserts fresh rows.
 *
 * This is not WordPress scraping — it mirrors the live gallery source of truth.
 *
 * Env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   IMAGEKIT_PRIVATE_KEY
 *   IMAGEKIT_CMS_ROOT (optional, default cms)
 *
 * Optional (defaults match the shipped memorial bundle):
 *   SOURCE_SUPABASE_URL
 *   SOURCE_SUPABASE_ANON_KEY
 *
 * Usage:
 *   node scripts/import-photos-wechsler-archive.mjs --dry-run
 *   node scripts/import-photos-wechsler-archive.mjs
 *   node scripts/import-photos-wechsler-archive.mjs --from=browser   # Playwright: same GET /archive_photos as Photos tab (+ DOM fallback)
 *   node scripts/import-photos-wechsler-archive.mjs --max=50
 *   node scripts/import-photos-wechsler-archive.mjs --keep-imagekit   # skip ImageKit folder delete
 *   node scripts/import-photos-wechsler-archive.mjs --wipe-only         # only clear ImageKit + DB (no import)
 *
 * --from=browser requires: npm i && npx playwright install chromium
 */

import sharp from "sharp"
import ImageKit from "@imagekit/nodejs"
import { createClient } from "@supabase/supabase-js"
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

const DEFAULT_SOURCE_URL = "https://prinomaaszkdknrluweo.supabase.co"
const DEFAULT_SOURCE_ANON_KEY = "sb_publishable_4bHkMDRWSrE5jqR2QLphhw_r-tSsaAJ"

const SOURCE_SUPABASE_URL = process.env.SOURCE_SUPABASE_URL ?? DEFAULT_SOURCE_URL
const SOURCE_SUPABASE_ANON_KEY =
  process.env.SOURCE_SUPABASE_ANON_KEY ?? DEFAULT_SOURCE_ANON_KEY

const DEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const DEST_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run")
  const keepImageKit = process.argv.includes("--keep-imagekit")
  const wipeOnly = process.argv.includes("--wipe-only")
  const fromArg = process.argv.find((a) => a.startsWith("--from="))
  const fromRaw = fromArg ? fromArg.split("=").slice(1).join("=").toLowerCase() : "supabase"
  const from = fromRaw === "browser" ? "browser" : "supabase"
  let max = Infinity
  const maxArg = process.argv.find((a) => a.startsWith("--max="))
  if (maxArg) {
    const n = parseInt(maxArg.split("=")[1], 10)
    if (!Number.isNaN(n)) max = n
  }
  return { dryRun, max, keepImageKit, wipeOnly, from }
}

function cmsPhotosFolderPathForDelete() {
  const root = (process.env.IMAGEKIT_CMS_ROOT ?? "cms").replace(/^\/+|\/+$/g, "")
  return `/${root}/photos/`
}

async function fetchArchivePhotos(max) {
  const source = createClient(SOURCE_SUPABASE_URL, SOURCE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const pageSize = 500
  let from = 0
  const all = []

  for (;;) {
    const to = from + pageSize - 1
    const { data, error } = await source
      .from("archive_photos")
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

const MEMORIAL_ORIGIN = "https://wechsler-grossman.com"

function isLikelyGalleryImageUrl(url) {
  if (!url || !url.startsWith("http")) return false
  const l = url.toLowerCase()
  if (l.includes("gravatar.com") || l.includes("emoji") || l.includes("1x1")) return false
  if (l.includes(".mp3") || l.includes(".mp4") || l.includes(".webm")) return false
  return (
    /\/storage\/v1\/object\//i.test(l) ||
    /\.(jpe?g|png|gif|webp)(\?|$)/i.test(l)
  )
}

/**
 * Opens the memorial site like a user (Photos tab), captures the same Supabase
 * `GET .../archive_photos` JSON the UI uses. If that array is empty, collects
 * visible `img[src]` URLs as a fallback (Supabase Storage / direct image links).
 */
async function fetchArchivePhotosBrowser(max) {
  let chromium
  try {
    ;({ chromium } = await import("playwright"))
  } catch {
    throw new Error(
      'Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium',
    )
  }

  const headless = process.env.PW_HEADLESS !== "0"
  const browser = await chromium.launch({ headless })
  const page = await browser.newPage()

  let apiRows = []
  page.on("response", async (resp) => {
    const u = resp.url()
    if (!u.includes("/rest/v1/archive_photos")) return
    if (resp.request().method() !== "GET") return
    const st = resp.status()
    if (st < 200 || st >= 300) return
    try {
      const ct = (resp.headers()["content-type"] || "").toLowerCase()
      if (!ct.includes("json")) return
      const j = await resp.json()
      if (Array.isArray(j) && j.length > apiRows.length) apiRows = j
    } catch {
      /* ignore parse errors */
    }
  })

  await page.goto(MEMORIAL_ORIGIN, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  })

  const nav = page.locator("nav").first()
  await nav
    .getByText(/^Fotos$/i)
    .first()
    .click({ timeout: 5000 })
    .catch(async () => {
      await nav.getByText(/^Photos$/i).first().click({ timeout: 5000 })
    })
    .catch(async () => {
      await page.getByText(/^Fotos$|^Photos$/i).first().click({ timeout: 8000 })
    })

  await new Promise((r) => setTimeout(r, 4000))

  const domSrcs = await page
    .$$eval("img[src]", (els) =>
      els.map((el) => el.getAttribute("src")).filter(Boolean),
    )
    .catch(() => [])

  await browser.close()

  let rows = apiRows.length ? [...apiRows] : []
  if (!rows.length) {
    const seen = new Set()
    for (const src of domSrcs) {
      if (!isLikelyGalleryImageUrl(src)) continue
      let abs = src
      if (src.startsWith("/")) abs = `${MEMORIAL_ORIGIN}${src}`
      if (seen.has(abs)) continue
      seen.add(abs)
      rows.push({ url: abs, caption: null, contributor: null })
    }
  }

  return rows.slice(0, max)
}

async function deleteImageKitPhotosFolder(ik) {
  const folderPath = cmsPhotosFolderPathForDelete()
  try {
    await ik.folders.delete({ folderPath })
    console.log(`ImageKit: deleted folder ${folderPath}`)
  } catch (e) {
    const msg = e?.message ?? String(e)
    if (/404|not\s*found|does not exist/i.test(msg)) {
      console.log(`ImageKit: folder ${folderPath} not found or already empty (ok).`)
    } else {
      throw e
    }
  }
}

async function clearDestPhotos(dest) {
  const { data: rows, error: selErr } = await dest.from("photos").select("id")
  if (selErr) throw selErr
  const ids = (rows ?? []).map((r) => r.id)
  if (!ids.length) {
    console.log("Supabase: photos table already empty.")
    return
  }
  const { error: delErr } = await dest.from("photos").delete().in("id", ids)
  if (delErr) throw delErr
  console.log(`Supabase: deleted ${ids.length} photo row(s).`)
}

async function downloadAndCompress(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download ${res.status} ${url.slice(0, 80)}`)
  const raw = Buffer.from(await res.arrayBuffer())
  return sharp(raw)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()
}

async function uploadToImageKit(buffer, fileName) {
  const auth = Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString("base64")
  const formData = new FormData()
  formData.append("file", new Blob([buffer]), fileName)
  formData.append("fileName", fileName)
  formData.append("folder", imageKitCmsFolder("photos"))

  const res = await fetch("https://upload.imagekit.io/api/v2/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: formData,
  })
  if (!res.ok) throw new Error(`ImageKit ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return json.url
}

function titleForRow(row, index) {
  const cap = (row.caption && String(row.caption).trim()) || ""
  const contrib = (row.contributor && String(row.contributor).trim()) || ""
  if (cap) return cap.slice(0, 200)
  if (contrib) return contrib.slice(0, 200)
  return `Photo ${index + 1}`
}

async function main() {
  const { dryRun, max, keepImageKit, wipeOnly, from } = parseArgs()

  if (!DEST_SUPABASE_URL || !DEST_SERVICE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
    process.exit(1)
  }
  if (!IMAGEKIT_PRIVATE_KEY && !dryRun) {
    console.error("Missing IMAGEKIT_PRIVATE_KEY.")
    process.exit(1)
  }

  if (wipeOnly) {
    console.log("Mode: --wipe-only (clear ImageKit folder + CMS photos, no import)\n")
    if (dryRun) {
      if (!keepImageKit) console.log(`Would delete ImageKit folder ${cmsPhotosFolderPathForDelete()}`)
      else console.log("Would keep ImageKit (--keep-imagekit)")
      console.log("Would clear public.photos")
      return
    }
    const ik = new ImageKit({ privateKey: IMAGEKIT_PRIVATE_KEY })
    if (!keepImageKit) await deleteImageKitPhotosFolder(ik)
    else console.log("Skipping ImageKit (--keep-imagekit).")
    const dest = createClient(DEST_SUPABASE_URL, DEST_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    await clearDestPhotos(dest)
    console.log("Wipe done.")
    return
  }

  if (from === "browser") {
    console.log(`Source: ${MEMORIAL_ORIGIN} (Playwright — Photos tab + /rest/v1/archive_photos)\n`)
  } else {
    console.log(`Source: ${SOURCE_SUPABASE_URL} / archive_photos (direct Supabase read)\n`)
  }
  console.log("Fetching…")

  let rows
  try {
    rows = from === "browser" ? await fetchArchivePhotosBrowser(max) : await fetchArchivePhotos(max)
  } catch (e) {
    console.error(e.message || e)
    if (from === "browser") {
      console.error("\nTip: run `npx playwright install chromium` or use --from=supabase (default).")
    }
    process.exit(1)
  }

  console.log(`Found ${rows.length} photo row(s).`)

  if (!rows.length) {
    console.log(
      "\nNo photos returned. The memorial gallery reads Supabase `archive_photos`;",
      "if that table is empty, add images on https://wechsler-grossman.com/ first.",
      "\nTo clear old CMS/ImageKit data only:",
      "  node scripts/import-photos-wechsler-archive.mjs --wipe-only",
    )
    return
  }

  const sample = rows[0]
  console.log("Sample row keys:", Object.keys(sample).join(", "))

  const dest = createClient(DEST_SUPABASE_URL, DEST_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (dryRun) {
    console.log("\nDry run — would:")
    if (!keepImageKit) console.log(`  - Delete ImageKit folder ${cmsPhotosFolderPathForDelete()}`)
    else console.log("  - Keep existing ImageKit files (--keep-imagekit)")
    console.log("  - Clear all rows in public.photos")
    console.log(`  - Upload up to ${rows.length} image(s) and insert new rows`)
    return
  }

  const ik = new ImageKit({ privateKey: IMAGEKIT_PRIVATE_KEY })
  if (!keepImageKit) {
    await deleteImageKitPhotosFolder(ik)
  } else {
    console.log("Skipping ImageKit (--keep-imagekit).")
  }

  await clearDestPhotos(dest)

  let ok = 0
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const url = typeof row.url === "string" ? row.url.trim() : ""
    if (!url || !url.startsWith("http")) {
      console.warn(`[${i + 1}] skip: missing url`, row?.id ?? "")
      continue
    }
    const title = titleForRow(row, i)
    const suffix = row.id ? String(row.id).replace(/-/g, "").slice(0, 12) : String(i)
    const fileName = `archive-${suffix}.jpg`

    try {
      const compressed = await downloadAndCompress(url)
      const ikUrl = await uploadToImageKit(compressed, fileName)
      const { error } = await dest.from("photos").insert({ title, image_url: ikUrl })
      if (error) throw error
      ok++
      const short = title.length > 60 ? `${title.slice(0, 60)}…` : title
      console.log(`[${ok}/${rows.length}] ${short}`)
    } catch (e) {
      console.error(`[${i + 1}] Error:`, e?.message ?? e)
    }
  }

  console.log(`\nDone. Inserted ${ok} photo(s).`)
}

main().catch((e) => {
  console.error("Import failed:", e?.message ?? e)
  process.exit(1)
})
