/**
 * Creates the ImageKit folder layout used by the CMS:
 *   cms/photos, cms/books, cms/tributes
 *
 * ImageKit only shows folders after at least one file exists, so we upload a tiny 1×1 PNG
 * into each path (you can delete `_cms-folder-placeholder.png` later).
 *
 * Requires: IMAGEKIT_PRIVATE_KEY in .env.local (same as CMS uploads)
 * Optional: IMAGEKIT_CMS_ROOT (default: cms)
 *
 * Usage: npm run imagekit:init-folders
 */

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

const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY
// 1×1 transparent PNG
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

const SUBFOLDERS = ["photos", "books", "tributes"]

async function uploadOne(folder, label) {
  const auth = Buffer.from(`${PRIVATE_KEY}:`).toString("base64")
  const formData = new FormData()
  formData.append("file", new Blob([TINY_PNG]), "_cms-folder-placeholder.png")
  formData.append("fileName", "_cms-folder-placeholder.png")
  formData.append("folder", folder)

  const res = await fetch("https://upload.imagekit.io/api/v2/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: formData,
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${label}: ${res.status} ${text}`)
  }
  const json = JSON.parse(text)
  return json.url
}

async function main() {
  if (!PRIVATE_KEY) {
    console.error("Missing IMAGEKIT_PRIVATE_KEY in .env.local")
    process.exit(1)
  }

  const root = (process.env.IMAGEKIT_CMS_ROOT ?? "cms").replace(/^\/+|\/+$/g, "")
  console.log(`Creating folders under ImageKit root "${root}/" …\n`)

  for (const sub of SUBFOLDERS) {
    const folder = imageKitCmsFolder(sub)
    try {
      const url = await uploadOne(folder, folder)
      console.log(`OK  ${folder}/  →  ${url}`)
    } catch (e) {
      console.error(`FAIL ${folder}:`, e.message)
    }
  }

  console.log(
    `

Done. Open ImageKit → Media Library → Media → you should see folder "${root}" with subfolders.
You can delete the _cms-folder-placeholder.png files if you want.`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
