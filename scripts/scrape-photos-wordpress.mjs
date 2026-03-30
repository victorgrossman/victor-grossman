/**
 * Pulls images from Victor Grossman's Berlin Bulletin (WordPress.com), uploads to
 * ImageKit (cms/photos), and upserts Supabase `photos` — same idea as scrape-books-buecher.
 *
 * Source (default): list posts via WordPress REST API, then fetch each post's **permalink HTML**
 * (REST `content` often omits images that appear on the live page — only ~2 posts had uploads in body).
 * Optional: --rest-body-only — skip permalink fetches (fast, incomplete).
 * Optional: --page=URL — scrape one HTML page only.
 *
 * Env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   IMAGEKIT_PRIVATE_KEY
 *   WORDPRESS_SITE (optional, default victorgrossmansberlinbulletin.wordpress.com)
 *
 * Usage:
 *   node scripts/scrape-photos-wordpress.mjs --dry-run
 *   node scripts/scrape-photos-wordpress.mjs --max=30
 *   node scripts/scrape-photos-wordpress.mjs --rest-body-only   # fast, misses most images
 *   node scripts/scrape-photos-wordpress.mjs --page=https://victorgrossmansberlinbulletin.wordpress.com/uber/
 */

import sharp from "sharp"
import { imageKitCmsFolder } from "./lib/imagekit-cms-folder.mjs"
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY
const WORDPRESS_SITE =
  process.env.WORDPRESS_SITE || "victorgrossmansberlinbulletin.wordpress.com"

const POSTS_PER_PAGE = 20

function decodeHtmlEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function canonicalImageUrl(url) {
  try {
    const u = new URL(url)
    u.search = ""
    u.hash = ""
    return u.href
  } catch {
    return url.split("?")[0].split("#")[0]
  }
}

/** Match import-photos.mjs — do not exclude `cropped-…` (WP uses that for many real images). */
function shouldIncludeImageUrl(url) {
  const lower = url.toLowerCase()
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
    return false
  }
  if (!lower.includes("/wp-content/uploads/")) return false
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url)
}

function firstUrlFromSrcset(srcset) {
  if (!srcset || typeof srcset !== "string") return null
  const part = srcset.split(",")[0].trim()
  const url = part.split(/\s+/)[0]
  return url && url.startsWith("http") ? url : null
}

function extractImageUrlsFromContent(html) {
  const found = new Map()
  const add = (raw) => {
    const decoded = decodeHtmlEntities(raw.trim())
    if (!decoded.startsWith("http")) return
    if (!shouldIncludeImageUrl(decoded)) return
    const key = canonicalImageUrl(decoded)
    const prev = found.get(key)
    if (!prev || decoded.length < prev.length) found.set(key, decoded)
  }
  let m
  const reOrig = /data-orig-file="([^"]+)"/gi
  while ((m = reOrig.exec(html))) add(m[1])
  const reLarge = /data-large-file="([^"]+)"/gi
  while ((m = reLarge.exec(html))) add(m[1])
  const reSrc = /<img[^>]+src="([^"]+)"/gi
  while ((m = reSrc.exec(html))) add(m[1])
  const reDataSrc = /\bdata-src="([^"]+)"/gi
  while ((m = reDataSrc.exec(html))) add(m[1])
  const reLazy = /\bdata-lazy-src="([^"]+)"/gi
  while ((m = reLazy.exec(html))) add(m[1])
  const reSrcset = /\b(?:srcset|data-srcset)="([^"]+)"/gi
  while ((m = reSrcset.exec(html))) {
    const u = firstUrlFromSrcset(m[1])
    if (u) add(u)
  }
  return [...found.values()]
}

function stripTags(html) {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
}

function photoTitle(postTitle, index, total) {
  const base = postTitle.slice(0, 200) || "Photo"
  if (total <= 1) return base
  return `${base} (${index}/${total})`
}

/** Scrape WordPress.com HTML for direct wp-content/uploads URLs (supplements img tags). */
function scrapePageImageUrls(html, hostPattern) {
  const escaped = hostPattern.replace(/\./g, "\\.")
  const re = new RegExp(
    `https:\\/\\/${escaped}\\/wp-content\\/uploads\\/[^"'\s<>]+\\.(jpe?g|png|gif|webp)`,
    "gi",
  )
  const out = new Set()
  for (const m of html.matchAll(re)) {
    let u = m[0].split("?")[0]
    if (/\/120\.jpe?g$/i.test(u)) continue
    if (/pixel\.wp\.com/i.test(u)) continue
    if (shouldIncludeImageUrl(u)) out.add(u)
  }
  return [...out]
}

/** @param {string} [hostForRegex] — hostname for loose URL scan (default: WORDPRESS_SITE) */
function mergeImageUrlsFromPostHtml(html, hostForRegex = WORDPRESS_SITE) {
  const fromTags = extractImageUrlsFromContent(html)
  const fromRegex = scrapePageImageUrls(html, hostForRegex)
  const map = new Map()
  for (const u of [...fromTags, ...fromRegex]) {
    const key = canonicalImageUrl(u)
    const prev = map.get(key)
    if (!prev || u.length < prev.length) map.set(key, u)
  }
  return [...map.values()]
}

async function fetchPostHtml(permalink) {
  const res = await fetch(permalink, {
    headers: { "User-Agent": "VictorGrossmanCMSPhotoImport/1.0" },
  })
  if (!res.ok) return null
  return res.text()
}

async function fetchAllPosts() {
  const all = []
  let offset = 0
  const base = `https://public-api.wordpress.com/rest/v1.1/sites/${encodeURIComponent(
    WORDPRESS_SITE,
  )}/posts/`

  for (;;) {
    const url = `${base}?number=${POSTS_PER_PAGE}&offset=${offset}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`WordPress API ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = await res.json()
    const posts = data.posts || []
    if (!posts.length) break
    all.push(...posts)
    offset += posts.length
    if (posts.length < POSTS_PER_PAGE) break
  }
  return all
}

async function downloadAndCompress(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download ${res.status}`)
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

async function supabaseListPhotos() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/photos?select=id,title`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function supabasePatchPhoto(id, image_url) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/photos?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ image_url }),
  })
  if (!res.ok) throw new Error(await res.text())
}

async function supabaseInsertPhoto(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/photos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(await res.text())
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run")
  const restBodyOnly = process.argv.includes("--rest-body-only")
  let max = Infinity
  const maxArg = process.argv.find((a) => a.startsWith("--max="))
  if (maxArg) {
    const n = parseInt(maxArg.split("=")[1], 10)
    if (!Number.isNaN(n)) max = n
  }
  const pageArg = process.argv.find((a) => a.startsWith("--page="))
  const pageUrl = pageArg ? pageArg.split("=").slice(1).join("=").trim() : ""
  return { dryRun, max, pageUrl, restBodyOnly }
}

async function buildItemsFromApi(restBodyOnly) {
  const posts = await fetchAllPosts()
  const items = []
  const seenCanonical = new Set()
  const total = posts.length

  for (let pi = 0; pi < posts.length; pi++) {
    const post = posts[pi]
    let html = post.content || ""
    if (!restBodyOnly && post.URL) {
      const live = await fetchPostHtml(post.URL)
      if (live) {
        html = live
      } else {
        console.warn(`Could not fetch permalink (${pi + 1}/${total}): ${post.URL}`)
      }
      await new Promise((r) => setTimeout(r, 150))
    }

    const postTitle = stripTags(post.title || "")
    const urls = mergeImageUrlsFromPostHtml(html)
    const newForPost = []
    for (const sourceUrl of urls) {
      const key = canonicalImageUrl(sourceUrl)
      if (seenCanonical.has(key)) continue
      seenCanonical.add(key)
      newForPost.push(sourceUrl)
    }
    newForPost.forEach((sourceUrl, j) => {
      items.push({
        title: photoTitle(postTitle, j + 1, newForPost.length),
        sourceUrl,
      })
    })
  }
  return items
}

async function buildItemsFromPage(pageUrl) {
  const res = await fetch(pageUrl)
  if (!res.ok) throw new Error(`Page fetch ${res.status}`)
  const html = await res.text()
  let host = WORDPRESS_SITE
  try {
    host = new URL(pageUrl).hostname
  } catch {
    /* keep default */
  }
  const merged = mergeImageUrlsFromPostHtml(html, host)
  return merged.map((sourceUrl, i) => ({
    title: `Page photo ${i + 1} (${merged.length})`,
    sourceUrl,
  }))
}

async function main() {
  const { dryRun, max, pageUrl, restBodyOnly } = parseArgs()

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
    process.exit(1)
  }
  if (!IMAGEKIT_PRIVATE_KEY && !dryRun) {
    console.error("Missing IMAGEKIT_PRIVATE_KEY.")
    process.exit(1)
  }

  let items
  if (pageUrl) {
    console.log(`Scraping single page: ${pageUrl}\n`)
    items = await buildItemsFromPage(pageUrl)
  } else {
    console.log(
      `WordPress site: ${WORDPRESS_SITE} (all posts — ${restBodyOnly ? "REST body only (incomplete)" : "fetching each post’s HTML"})\n`,
    )
    items = await buildItemsFromApi(restBodyOnly)
  }

  console.log(`Collected ${items.length} image(s) (before --max).\n`)

  let existing = []
  try {
    existing = await supabaseListPhotos()
  } catch (e) {
    console.warn("Could not list photos:", e.message)
  }
  const titleToId = new Map(
    (existing || []).map((r) => [String(r.title || "").trim(), r.id]),
  )

  let processed = 0
  for (let i = 0; i < items.length && processed < max; i++) {
    const { title, sourceUrl } = items[i]
    console.log(`[${processed + 1}] ${title}`)
    console.log(`  Source: ${sourceUrl}`)

    if (dryRun) {
      const id = titleToId.get(title.trim())
      console.log(`  → would ${id ? "PATCH " + id : "INSERT"}\n`)
      processed++
      continue
    }

    try {
      const compressed = await downloadAndCompress(sourceUrl)
      const baseName =
        sourceUrl.split("/").pop()?.replace(/\?.*$/, "") || `photo-${i}.jpg`
      const fileName = baseName.replace(/\.(png|gif|webp)$/i, ".jpg")
      const ikUrl = await uploadToImageKit(compressed, fileName)
      console.log(`  ImageKit: ${ikUrl}`)

      const id = titleToId.get(title.trim())
      if (id) {
        await supabasePatchPhoto(id, ikUrl)
        console.log(`  Supabase: updated ${id}\n`)
      } else {
        await supabaseInsertPhoto({ title, image_url: ikUrl })
        console.log(`  Supabase: inserted\n`)
      }
    } catch (e) {
      console.error(`  Error: ${e.message}\n`)
    }
    processed++
  }

  console.log(dryRun ? "Dry run done." : "Done.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
