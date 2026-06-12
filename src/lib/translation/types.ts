export type SiteLang = "en" | "de";

export type TranslatableContentType = "article" | "bulletin";

export type TranslatableField = "title" | "content" | "excerpt";

export type TranslationFormat = "text" | "html";

export interface TranslationFieldInput {
  contentType: TranslatableContentType;
  contentId: string;
  field: TranslatableField;
  text: string;
  format?: TranslationFormat;
}

export interface TranslationRequest {
  targetLang: SiteLang;
  fields: TranslationFieldInput[];
}

export type TranslationResultMap = Record<string, string>;

export function translationKey(
  contentType: TranslatableContentType,
  contentId: string,
  field: TranslatableField,
): string {
  return `${contentType}:${contentId}:${field}`;
}
