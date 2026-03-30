/**
 * Scrapes https://victorgrossmansberlinbulletin.wordpress.com/books-buecher/
 * for cover image URLs, downloads each, uploads to ImageKit (cms/books), and
 * updates Supabase `books.image_url` (and inserts rows if missing).
 * Removes the previous ImageKit cover (if any) before upload and sets
 * useUniqueFileName=false so re-runs overwrite the same filename instead of piling up duplicates.
 *
 * Env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   — required for PATCH/insert (RLS)
 *   IMAGEKIT_PRIVATE_KEY
 *
 * Usage:
 *   node scripts/scrape-books-buecher.mjs
 *   node scripts/scrape-books-buecher.mjs --dry-run
 */

import sharp from "sharp"
import { imageKitCmsFolder } from "./lib/imagekit-cms-folder.mjs"
import { deleteImageKitFileByPublicUrl } from "./lib/imagekit-delete-by-url.mjs"
import { readFileSync, existsSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

const BOOKS_PAGE =
  "https://victorgrossmansberlinbulletin.wordpress.com/books-buecher/"

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
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY

/** Canonical book rows (metadata + WordPress image filename to match on the page). */
const BOOKS = [
  {
    title: "A Socialist Defector: From Harvard to Karl-Marx-Allee",
    author: "Victor Grossman",
    description: "Monthly Review Press, New York 2019, ISBN 978-5836773-8-4",
    sourceImageFile: "2019-a-socialist-defector.jpg",
  },
  {
    title: "Crossing the River: Vom Broadway zur Karl-Marx-Allee",
    author: "Victor Grossman",
    description: "Eine Autobiografie; Verlag Wiljo Heinen, 2014",
    sourceImageFile: "2014-crossing_the_river-deutsch.jpg",
  },
  {
    title: "Rebel Girls: 34 amerikanische Frauen im Porträt",
    author: "Victor Grossman",
    description: "PapyRossa Verlag, 2013",
    sourceImageFile: "2013-rebel_girls.jpg",
  },
  {
    title: "Ein Ami blickt auf die DDR zurück",
    author: "Victor Grossman",
    description: "Spotless, 2011",
    sourceImageFile: "2011-ein_ami_blickt_auf_die_ddr_zurueck.jpg",
  },
  {
    title: "Madrid – du Wunderbare",
    author: "Victor Grossman",
    description:
      "Ein Amerikaner blättert in der Geschichte des Spanienkrieges; GNN Verlag, 2006",
    sourceImageFile: "2006-madrid_du_wunderbare.jpg",
  },
  {
    title:
      "Crossing the River: A Memoir of the American Left, the Cold War, and Life in East Germany",
    author: "Victor Grossman",
    description: "University of Massachusetts Press, 2003 (IN ENGLISH)",
    sourceImageFile: "2003-crossing_the_river-english.jpg",
  },
  {
    title: "If I Had a Song: Lieder und Sänger der USA",
    author: "Victor Grossman",
    description: "Lied der Zeit, 1988, 1990",
    sourceImageFile: "1988-if_i_had_a_song.jpg",
  },
  {
    title: "Der Weg über die Grenze",
    author: "Victor Grossman",
    description: "Neues Leben, 1985",
    sourceImageFile: "1985-der_weg_ueber_die_grenze.jpg",
  },
  {
    title: "Per Anhalter durch die USA",
    author: "Victor Grossman",
    description: "Neues Leben, 1976",
    sourceImageFile: "1976-per_anhalter_durch_die_usa.jpg",
  },
  {
    title: "Von Manhattan bis Kalifornien: Aus der Geschichte der USA",
    author: "Victor Grossman",
    description: "Kinderbuchverlag, 1975, 1978",
    sourceImageFile: "1975-von_manhattan_bis_kalifornien.jpg",
  },
  {
    title: "Nilpferd und Storch",
    author: "Victor Grossman",
    description: "Kinderbuchverlag, 1965",
    sourceImageFile: "1965-nilpferd_und_storch.jpg",
  },
]

function scrapeImageUrlsFromHtml(html) {
  const re =
    /https:\/\/victorgrossmansberlinbulletin\.wordpress\.com\/wp-content\/uploads\/[^"'\s<>]+\.(jpe?g|png|webp)/gi
  const out = new Set()
  for (const m of html.matchAll(re)) {
    let u = m[0].split("?")[0]
    if (/cropped-/i.test(u)) continue
    if (/pixel\.wp\.com/i.test(u)) continue
    if (/\/120\.jpe?g$/i.test(u)) continue
    out.add(u)
  }
  return [...out]
}

function pickSourceUrlForBook(scrapedUrls, sourceImageFile) {
  const needle = sourceImageFile.toLowerCase()
  for (const u of scrapedUrls) {
    if (u.toLowerCase().endsWith(needle)) return u
  }
  const base = needle.replace(/\.[^.]+$/, "")
  for (const u of scrapedUrls) {
    const b = u.split("/").pop().toLowerCase().replace(/\?.*$/, "")
    if (b === needle || b.startsWith(base)) return u
  }
  return null
}

async function downloadAndCompress(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`)
  const raw = Buffer.from(await res.arrayBuffer())
  return sharp(raw)
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer()
}

async function uploadToImageKit(buffer, fileName) {
  const auth = Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString("base64")
  const formData = new FormData()
  formData.append("file", new Blob([buffer]), fileName)
  formData.append("fileName", fileName)
  formData.append("folder", imageKitCmsFolder("books"))
  /** Same logical filename on re-run overwrites instead of `name_abc123.jpg` duplicates. */
  formData.append("useUniqueFileName", "false")

  const res = await fetch("https://upload.imagekit.io/api/v2/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: formData,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ImageKit ${res.status}: ${text}`)
  }
  const json = await res.json()
  return json.url
}

async function supabaseGetBooks() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/books?select=id,title,image_url`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    },
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function supabasePatchBook(id, image_url) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/books?id=eq.${id}`, {
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

async function supabaseInsertBook(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/books`, {
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
  return { dryRun: process.argv.includes("--dry-run") }
}

async function main() {
  const { dryRun } = parseArgs()

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key (use SUPABASE_SERVICE_ROLE_KEY).")
    process.exit(1)
  }
  if (!IMAGEKIT_PRIVATE_KEY && !dryRun) {
    console.error("Missing IMAGEKIT_PRIVATE_KEY.")
    process.exit(1)
  }

  console.log(`Fetching ${BOOKS_PAGE} …`)
  const pageRes = await fetch(BOOKS_PAGE)
  if (!pageRes.ok) throw new Error(`Page fetch ${pageRes.status}`)
  const html = await pageRes.text()
  const scraped = scrapeImageUrlsFromHtml(html)
  console.log(`Found ${scraped.length} candidate image URL(s) on page.\n`)

  let existing = []
  try {
    existing = await supabaseGetBooks()
  } catch (e) {
    console.warn("Could not list books:", e.message)
  }
  const titleToRow = new Map(
    (existing || []).map((r) => [r.title.trim(), { id: r.id, image_url: r.image_url }]),
  )

  for (let i = 0; i < BOOKS.length; i++) {
    const book = BOOKS[i]
    const srcUrl = pickSourceUrlForBook(scraped, book.sourceImageFile)
    if (!srcUrl) {
      console.error(
        `[${i + 1}/${BOOKS.length}] No page image for ${book.sourceImageFile} — ${book.title}`,
      )
      continue
    }

    const safeName = book.sourceImageFile.replace(/\.\w+$/, ".jpg")
    console.log(`[${i + 1}/${BOOKS.length}] ${book.title}`)
    console.log(`  Source: ${srcUrl}`)

    if (dryRun) {
      console.log("  (dry-run, skip upload)\n")
      continue
    }

    let ikUrl = ""
    try {
      const row = titleToRow.get(book.title.trim())
      if (row?.image_url) {
        await deleteImageKitFileByPublicUrl(row.image_url, IMAGEKIT_PRIVATE_KEY)
        console.log(`  ImageKit: removed previous cover (if present)`)
      }
      const buf = await downloadAndCompress(srcUrl)
      ikUrl = await uploadToImageKit(buf, safeName)
      console.log(`  ImageKit: ${ikUrl}`)
    } catch (e) {
      console.error(`  Upload failed: ${e.message}\n`)
      continue
    }

    const id = titleToRow.get(book.title.trim())?.id
    try {
      if (id) {
        await supabasePatchBook(id, ikUrl)
        console.log(`  Supabase: updated row ${id}\n`)
      } else {
        await supabaseInsertBook({
          title: book.title,
          author: book.author,
          description: book.description,
          image_url: ikUrl,
        })
        console.log(`  Supabase: inserted new row\n`)
      }
    } catch (e) {
      console.error(`  Supabase error: ${e.message}\n`)
    }
  }

  console.log(dryRun ? "Dry run done." : "Done.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
