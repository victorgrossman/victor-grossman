/**
 * All CMS media uploads live under one ImageKit root folder (default `cms`),
 * then by type: e.g. `cms/photos`, `cms/books` (no leading slash — matches ImageKit
 * Media Library folder tree).
 *
 * Set `IMAGEKIT_CMS_ROOT` in `.env.local` to change the root (e.g. `cms`).
 */
export function imageKitCmsFolder(subfolder: string): string {
  const root = (process.env.IMAGEKIT_CMS_ROOT ?? "cms").replace(/^\/+|\/+$/g, "")
  const sub = subfolder.replace(/^\/+|\/+$/g, "")
  if (!root) return sub
  return `${root}/${sub}`
}
