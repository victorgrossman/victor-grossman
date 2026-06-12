import type { SiteLang } from "./types";

const MAX_CHARS = 4500;

function langPair(source: SiteLang, target: SiteLang): string {
  return `${source}|${target}`;
}

/** Free fallback when DeepL is not configured (lower quality, rate-limited). */
export async function translateWithMyMemory(
  text: string,
  targetLang: SiteLang,
  sourceLang: SiteLang,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const chunk = trimmed.slice(0, MAX_CHARS);
  const pair = langPair(sourceLang, targetLang);
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${pair}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return text;

  const json = (await res.json()) as {
    responseData?: { translatedText?: string };
  };

  const translated = json.responseData?.translatedText?.trim();
  if (!translated || translated.toUpperCase() === chunk.toUpperCase()) {
    return text;
  }

  return trimmed.length > MAX_CHARS
    ? translated + trimmed.slice(MAX_CHARS)
    : translated;
}

export async function translateManyWithMyMemory(
  texts: string[],
  targetLang: SiteLang,
  sourceLang: SiteLang,
): Promise<string[]> {
  const out: string[] = [];
  for (const text of texts) {
    out.push(await translateWithMyMemory(text, targetLang, sourceLang));
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}
