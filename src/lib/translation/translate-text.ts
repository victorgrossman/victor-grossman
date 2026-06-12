import translate from "google-translate-api-x";

const RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const CHUNK_SIZE = 3500;
const CHUNK_DELAY_MS = 600;

export function splitForTranslation(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= CHUNK_SIZE) return [normalized];

  const chunks: string[] = [];
  const paragraphs = normalized.split(/\n{2,}/);
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= CHUNK_SIZE) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (paragraph.length <= CHUNK_SIZE) {
      current = paragraph;
      continue;
    }

    for (let i = 0; i < paragraph.length; i += CHUNK_SIZE) {
      chunks.push(paragraph.slice(i, i + CHUNK_SIZE));
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export type TranslateLang = "en" | "de";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateChunk(
  text: string,
  from: TranslateLang,
  to: TranslateLang,
): Promise<string> {
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const result = await translate(text, {
        from,
        to,
        forceBatch: false,
        fallbackBatch: true,
      });
      return result.text;
    } catch (err) {
      if (attempt === RETRIES - 1) throw err;
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  return "";
}

export async function translateText(
  text: string,
  from: TranslateLang,
  to: TranslateLang,
): Promise<string> {
  if (from === to) return text.trim();

  const chunks = splitForTranslation(text);
  if (chunks.length === 0) return "";

  const parts: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    parts.push(await translateChunk(chunks[i], from, to));
    if (i < chunks.length - 1) await sleep(CHUNK_DELAY_MS);
  }

  return parts.join("\n\n");
}

export async function translateEnToDe(text: string): Promise<string> {
  return translateText(text, "en", "de");
}

export async function translateDeToEn(text: string): Promise<string> {
  return translateText(text, "de", "en");
}
