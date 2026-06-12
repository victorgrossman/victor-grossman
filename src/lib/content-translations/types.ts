export type ContentTranslationType = "article" | "bulletin";

export type ContentTranslationField = "title" | "content" | "excerpt";

export type SiteLang = "en" | "de";

export type TranslationMap = Record<string, string>;

export function translationKey(
  contentType: ContentTranslationType,
  contentId: string,
  field: ContentTranslationField,
): string {
  return `${contentType}:${contentId}:${field}`;
}
