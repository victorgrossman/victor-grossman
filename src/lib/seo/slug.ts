/** URL-safe slug from a title (ASCII, max 80 chars). */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Stable public URL segment: `{slugified-title}-{id-prefix}`. */
export function contentSlug(title: string, id: string): string {
  const base = slugify(title) || "item";
  const shortId = id.replace(/-/g, "").slice(0, 8);
  return `${base}-${shortId}`;
}

export function matchesContentSlug(
  title: string,
  id: string,
  param: string,
): boolean {
  return contentSlug(title, id) === param || id === param;
}

export function findByContentSlug<T extends { id: string; title: string }>(
  items: T[],
  param: string,
): T | undefined {
  return items.find((item) => matchesContentSlug(item.title, item.id, param));
}
