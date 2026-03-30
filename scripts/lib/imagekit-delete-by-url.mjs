/**
 * Delete an ImageKit asset by its public delivery URL (same logic as src/lib/imagekit.ts).
 * For use from Node .mjs scripts.
 */
import ImageKit from "@imagekit/nodejs"

function normalizeImageKitUrl(url) {
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname}`
  } catch {
    return (url.split("?")[0] ?? "").replace(/#.*$/, "")
  }
}

function isLikelyImageKitDeliveryUrl(url) {
  try {
    return new URL(url).hostname.endsWith("imagekit.io")
  } catch {
    return false
  }
}

function imageKitFilePathFromPublicUrl(publicUrl) {
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
 * @param {string | null | undefined} publicUrl
 * @param {string} privateKey
 */
export async function deleteImageKitFileByPublicUrl(publicUrl, privateKey) {
  const raw = typeof publicUrl === "string" ? publicUrl.trim() : ""
  if (!raw || !isLikelyImageKitDeliveryUrl(raw) || !privateKey?.trim()) return

  const ik = new ImageKit({ privateKey: privateKey.trim() })
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
            ? item.fileId
            : undefined
        if (!fileId) continue

        const fp =
          item && typeof item === "object" && "filePath" in item
            ? String(item.filePath ?? "")
            : ""
        const normalizedFp = fp.startsWith("/") ? fp : `/${fp}`

        const itemUrl =
          item && typeof item === "object" && "url" in item
            ? String(item.url ?? "")
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
    console.warn("ImageKit delete failed:", e?.message ?? e)
  }
}
