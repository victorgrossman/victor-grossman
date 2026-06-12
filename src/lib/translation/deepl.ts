import type { SiteLang } from "./types";

const DEEPL_LANG: Record<SiteLang, string> = {
  en: "EN",
  de: "DE",
};

export class TranslationUnavailableError extends Error {
  constructor(message = "Translation service is not configured.") {
    super(message);
    this.name = "TranslationUnavailableError";
  }
}

function deeplBaseUrl(): string {
  return (
    process.env.DEEPL_API_URL?.replace(/\/$/, "") ||
    "https://api-free.deepl.com"
  );
}

export function isTranslationConfigured(): boolean {
  return Boolean(process.env.DEEPL_API_KEY?.trim());
}

export async function translateWithDeepL(
  texts: string[],
  targetLang: SiteLang,
  options?: { html?: boolean; sourceLang?: SiteLang },
): Promise<string[]> {
  const apiKey = process.env.DEEPL_API_KEY?.trim();
  if (!apiKey) throw new TranslationUnavailableError();

  const nonEmpty = texts.map((t) => t.trim());
  if (nonEmpty.every((t) => !t)) return texts;

  const body = new URLSearchParams();
  for (const text of texts) {
    body.append("text", text);
  }
  body.append("target_lang", DEEPL_LANG[targetLang]);
  if (options?.sourceLang) {
    body.append("source_lang", DEEPL_LANG[options.sourceLang]);
  }
  if (options?.html) {
    body.append("tag_handling", "html");
  }

  const res = await fetch(`${deeplBaseUrl()}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`DeepL error ${res.status}: ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    translations?: { text: string }[];
  };

  const out = json.translations?.map((t) => t.text) ?? [];
  if (out.length !== texts.length) {
    throw new Error("DeepL returned an unexpected number of translations.");
  }
  return out;
}
