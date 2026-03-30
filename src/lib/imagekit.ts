import ImageKit, { toFile } from "@imagekit/nodejs"
import sharp from "sharp"

import { imageKitCmsFolder } from "./imagekit-paths"

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY ?? "",
})

function imageKitClientOrNull(): ImageKit | null {
  const key = process.env.IMAGEKIT_PRIVATE_KEY?.trim()
  if (!key) return null
  return new ImageKit({ privateKey: key })
}

function normalizeImageKitUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname}`
  } catch {
    return (url.split("?")[0] ?? "").replace(/#.*$/, "")
  }
}

/** True for default `*.imagekit.io` delivery URLs (custom CDN domains are skipped). */
function isLikelyImageKitDeliveryUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith("imagekit.io")
  } catch {
    return false
  }
}

/**
 * `https://ik.imagekit.io/<endpointId>/cms/photos/foo.jpg` → `/cms/photos/foo.jpg`
 */
function imageKitFilePathFromPublicUrl(publicUrl: string): string | null {
  try {
    const u = new URL(publicUrl)
    if (!u.hostname.endsWith("imagekit.io")) return null
    const parts = u.pathname.split("/").filter(Boolean)
    if (parts.length < 2) return null
    return `/${parts.slice(1).join("/")}`
  } catch {
    return null
  }
}

/**
 * Deletes a file from the ImageKit media library using its public delivery URL.
 * No-ops for non-ImageKit URLs or missing credentials. Swallows API errors (logs only).
 */
export async function deleteImageKitFileByPublicUrl(
  publicUrl: string | null | undefined,
): Promise<void> {
  const raw = typeof publicUrl === "string" ? publicUrl.trim() : ""
  if (!raw || !isLikelyImageKitDeliveryUrl(raw)) return

  const ik = imageKitClientOrNull()
  if (!ik) return

  const filePath = imageKitFilePathFromPublicUrl(raw)
  if (!filePath) return

  const lastSlash = filePath.lastIndexOf("/")
  const folderPath =
    lastSlash <= 0 ? "/" : `${filePath.slice(0, lastSlash + 1)}`
  const pathParam = folderPath.endsWith("/") ? folderPath : `${folderPath}/`

  const targetNorm = normalizeImageKitUrl(raw)

  try {
    let skip = 0
    const limit = 1000
    for (;;) {
      const list = await ik.assets.list({
        path: pathParam,
        type: "file",
        limit,
        skip,
      })
      const items = Array.isArray(list) ? list : []
      for (const item of items) {
        const fileId =
          item && typeof item === "object" && "fileId" in item
            ? (item as { fileId?: string }).fileId
            : undefined
        if (!fileId) continue

        const fp =
          item && typeof item === "object" && "filePath" in item
            ? String((item as { filePath?: string }).filePath ?? "")
            : ""
        const normalizedFp = fp.startsWith("/") ? fp : `/${fp}`

        const itemUrl =
          item && typeof item === "object" && "url" in item
            ? String((item as { url?: string }).url ?? "")
            : ""

        if (
          normalizedFp === filePath ||
          (itemUrl && normalizeImageKitUrl(itemUrl) === targetNorm)
        ) {
          await ik.files.delete(fileId)
          return
        }
      }
      if (items.length < limit) break
      skip += limit
    }
  } catch (e) {
    console.error("ImageKit deleteImageKitFileByPublicUrl:", e)
  }
}

async function compressBuffer(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer()
}

/**
 * Upload a File (from a form submission) to ImageKit and return the URL.
 * Compresses the image server-side with sharp before uploading.
 */
export async function uploadToImageKit(
  file: File,
  folder: string,
): Promise<string> {
  const bytes = await file.arrayBuffer()
  const raw = Buffer.from(bytes)
  const compressed = await compressBuffer(raw)

  const originalName = file.name ?? "upload.jpg"
  const fileName = originalName.replace(/\.\w+$/, ".jpg")
  const imageFile = await toFile(compressed, fileName, { type: "image/jpeg" })

  const result = await imagekit.files.upload({
    file: imageFile,
    fileName,
    folder: imageKitCmsFolder(folder),
  })

  const url = result.url
  if (!url) throw new Error("ImageKit upload: missing returned URL.")
  return url
}

/**
 * Upload a raw Buffer to ImageKit (for import scripts / server-side use).
 * Compresses with sharp before uploading.
 */
export async function uploadBufferToImageKit(
  buffer: Buffer,
  fileName: string,
  folder: string,
): Promise<string> {
  const compressed = await compressBuffer(buffer)

  const safeFileName = (fileName || "upload.jpg").replace(/\.\w+$/, ".jpg")
  const imageFile = await toFile(compressed, safeFileName, { type: "image/jpeg" })

  const result = await imagekit.files.upload({
    file: imageFile,
    fileName: safeFileName,
    folder: imageKitCmsFolder(folder),
  })

  const url = result.url
  if (!url) throw new Error("ImageKit uploadBufferToImageKit: missing returned URL.")
  return url
}
