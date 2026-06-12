const AMAZON_HOST_PATTERN =
  /^(?:[a-z0-9-]+\.)*amazon\.[a-z.]{2,}$|^amzn\.to$|^a\.co$/i;

/** Normalize and validate an Amazon product URL. Empty input → null. */
export function parseAmazonUrl(
  input: string,
): { ok: true; url: string | null } | { ok: false } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, url: null };

  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (!AMAZON_HOST_PATTERN.test(host)) {
      return { ok: false };
    }

    url.protocol = "https:";
    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false };
  }
}
