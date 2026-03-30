/**
 * Must match `src/lib/imagekit-paths.ts` — ImageKit folder under root `cms` by default.
 * @param {string} subfolder e.g. "photos", "books"
 */
export function imageKitCmsFolder(subfolder) {
  const root = (process.env.IMAGEKIT_CMS_ROOT ?? "cms").replace(/^\/+|\/+$/g, "")
  const sub = String(subfolder).replace(/^\/+|\/+$/g, "")
  if (!root) return sub
  return `${root}/${sub}`
}
