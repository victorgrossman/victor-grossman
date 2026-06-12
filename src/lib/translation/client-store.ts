import { needsTranslation } from "./detect-lang";
import { plainExcerpt } from "./excerpt";
import type {
  SiteLang,
  TranslatableContentType,
  TranslatableField,
  TranslationFieldInput,
  TranslationResultMap,
} from "./types";
import { translationKey } from "./types";
import type { Bulletin } from "@/components/victor/types";

type Listener = () => void;

function storedKey(lang: SiteLang, mapKey: string): string {
  return `${lang}:${mapKey}`;
}

class TranslationClientStore {
  private cache = new Map<string, string>();
  private listeners = new Set<Listener>();
  private backgroundPromise: Promise<void> | null = null;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    for (const listener of this.listeners) listener();
  }

  getField(
    contentType: TranslatableContentType,
    contentId: string,
    field: TranslatableField,
    fallback: string,
    lang: SiteLang,
  ): string {
    const key = storedKey(
      lang,
      translationKey(contentType, contentId, field),
    );
    return this.cache.get(key) ?? fallback;
  }

  hasField(
    contentType: TranslatableContentType,
    contentId: string,
    field: TranslatableField,
    lang: SiteLang,
  ): boolean {
    return this.cache.has(
      storedKey(lang, translationKey(contentType, contentId, field)),
    );
  }

  private applyTranslations(lang: SiteLang, translations: TranslationResultMap) {
    for (const [mapKey, text] of Object.entries(translations)) {
      this.cache.set(storedKey(lang, mapKey), text);
    }
    this.notify();
  }

  private uncachedFields(
    fields: TranslationFieldInput[],
    lang: SiteLang,
  ): TranslationFieldInput[] {
    return fields.filter((field) => {
      if (!needsTranslation(field.text, lang)) return false;
      const key = storedKey(
        lang,
        translationKey(field.contentType, field.contentId, field.field),
      );
      return !this.cache.has(key);
    });
  }

  async fetchFields(
    fields: TranslationFieldInput[],
    lang: SiteLang,
  ): Promise<void> {
    const inputs = this.uncachedFields(fields, lang);
    if (inputs.length === 0) return;

    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLang: lang, fields: inputs }),
    });

    if (!res.ok) throw new Error("Translation request failed.");

    const { translations } = (await res.json()) as {
      translations: TranslationResultMap;
    };
    this.applyTranslations(lang, translations);
  }

  bulletinFields(
    bulletin: Bulletin,
    includeContent: boolean,
  ): TranslationFieldInput[] {
    const fields: TranslationFieldInput[] = [
      {
        contentType: "bulletin",
        contentId: bulletin.id,
        field: "title",
        text: bulletin.title,
      },
      {
        contentType: "bulletin",
        contentId: bulletin.id,
        field: "excerpt",
        text: plainExcerpt(bulletin.content),
      },
    ];

    if (includeContent) {
      fields.push({
        contentType: "bulletin",
        contentId: bulletin.id,
        field: "content",
        text: bulletin.content,
      });
    }

    return fields;
  }

  /** Translate opened bulletin first (title + full content). */
  async translateOpenBulletin(
    bulletin: Bulletin,
    lang: SiteLang,
  ): Promise<void> {
    await this.fetchFields(this.bulletinFields(bulletin, true), lang);
  }

  /** Prefetch list previews after the open bulletin is done. */
  prefetchBulletinPreviews(
    bulletins: Bulletin[],
    lang: SiteLang,
    excludeId?: string,
  ): void {
    const others = bulletins.filter((b) => b.id !== excludeId);
    if (others.length === 0) return;

    const fields = others.flatMap((bulletin) =>
      this.bulletinFields(bulletin, false),
    );

    const uncached = this.uncachedFields(fields, lang);
    if (uncached.length === 0) return;

    this.backgroundPromise = this.fetchFields(uncached, lang).catch((err) => {
      console.error("Background bulletin translation:", err);
    });
  }

  isBulletinFullyTranslated(bulletin: Bulletin, lang: SiteLang): boolean {
    if (!needsTranslation(bulletin.content, lang)) return true;
    return (
      this.hasField("bulletin", bulletin.id, "title", lang) &&
      this.hasField("bulletin", bulletin.id, "content", lang)
    );
  }
}

export const translationStore = new TranslationClientStore();

export function useTranslationStore(): TranslationClientStore {
  return translationStore;
}
