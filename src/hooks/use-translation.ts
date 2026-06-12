"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { needsTranslation } from "@/lib/translation/detect-lang";
import type {
  SiteLang,
  TranslatableContentType,
  TranslatableField,
  TranslationFieldInput,
  TranslationResultMap,
} from "@/lib/translation/types";
import { translationKey } from "@/lib/translation/types";

type FieldSpec = {
  field: TranslatableField;
  text: string;
  format?: "text" | "html";
};

type UseTranslationOptions = {
  contentType: TranslatableContentType;
  contentId: string;
  lang: SiteLang;
  fields: FieldSpec[];
  enabled?: boolean;
};

type UseTranslationResult = {
  values: Record<TranslatableField, string>;
  isTranslating: boolean;
  isTranslated: boolean;
};

const clientCache = new Map<string, TranslationResultMap>();

function cacheKey(lang: SiteLang, fields: TranslationFieldInput[]): string {
  return `${lang}:${fields
    .map(
      (f) =>
        `${f.contentType}:${f.contentId}:${f.field}:${f.text.length}:${f.text.slice(0, 32)}`,
    )
    .join("|")}`;
}

export function useTranslation({
  contentType,
  contentId,
  lang,
  fields,
  enabled = true,
}: UseTranslationOptions): UseTranslationResult {
  const originals = useMemo(() => {
    const map = {} as Record<TranslatableField, string>;
    for (const field of fields) {
      map[field.field] = field.text;
    }
    return map;
  }, [fields]);

  const [values, setValues] = useState(originals);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const requestIdRef = useRef(0);

  const fieldsSignature = useMemo(
    () =>
      JSON.stringify({
        contentType,
        contentId,
        lang,
        fields: fields.map((field) => ({
          field: field.field,
          format: field.format ?? "text",
          text: field.text,
        })),
      }),
    [contentId, contentType, fields, lang],
  );

  useEffect(() => {
    setValues(originals);

    const requiresTranslation = fields.some((field) =>
      needsTranslation(field.text, lang),
    );

    if (!enabled || !requiresTranslation) {
      setIsTranslating(false);
      setIsTranslated(false);
      return;
    }

    const inputs: TranslationFieldInput[] = fields
      .filter((field) => needsTranslation(field.text, lang))
      .map((field) => ({
        contentType,
        contentId,
        field: field.field,
        text: field.text,
        format: field.format,
      }));

    if (inputs.length === 0) {
      setIsTranslating(false);
      setIsTranslated(false);
      return;
    }

    const key = cacheKey(lang, inputs);
    const cached = clientCache.get(key);
    if (cached) {
      setValues((prev) => {
        const next = { ...prev };
        for (const input of inputs) {
          const tKey = translationKey(
            input.contentType,
            input.contentId,
            input.field,
          );
          if (cached[tKey]) next[input.field] = cached[tKey];
        }
        return next;
      });
      setIsTranslating(false);
      setIsTranslated(true);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsTranslating(true);
    setIsTranslated(false);

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLang: lang, fields: inputs }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Translation request failed.");
        return res.json() as Promise<{ translations: TranslationResultMap }>;
      })
      .then(({ translations }) => {
        if (requestId !== requestIdRef.current) return;

        clientCache.set(key, translations);
        setValues((prev) => {
          const next = { ...prev };
          for (const input of inputs) {
            const tKey = translationKey(
              input.contentType,
              input.contentId,
              input.field,
            );
            if (translations[tKey]) next[input.field] = translations[tKey];
          }
          return next;
        });
        setIsTranslated(true);
      })
      .catch((err) => {
        console.error("useTranslation:", err);
        if (requestId !== requestIdRef.current) return;
        setIsTranslated(false);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setIsTranslating(false);
      });
  }, [contentId, contentType, enabled, fieldsSignature, lang, originals]);

  return { values, isTranslating, isTranslated };
}

export function useTranslationBatch(
  lang: SiteLang,
  items: {
    contentType: TranslatableContentType;
    contentId: string;
    fields: FieldSpec[];
  }[],
  enabled = true,
): {
  getField: (
    contentType: TranslatableContentType,
    contentId: string,
    field: TranslatableField,
    fallback: string,
  ) => string;
  isTranslating: boolean;
  isTranslated: boolean;
} {
  const flatFields = useMemo(
    () =>
      items.flatMap((item) =>
        item.fields.map((field) => ({
          contentType: item.contentType,
          contentId: item.contentId,
          ...field,
        })),
      ),
    [items],
  );

  const [map, setMap] = useState<TranslationResultMap>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const requestIdRef = useRef(0);

  const flatSignature = useMemo(
    () =>
      JSON.stringify(
        flatFields.map((field) => ({
          contentType: field.contentType,
          contentId: field.contentId,
          field: field.field,
          format: field.format ?? "text",
          text: field.text,
        })),
      ),
    [flatFields],
  );

  useEffect(() => {
    const inputs: TranslationFieldInput[] = flatFields
      .filter((field) => needsTranslation(field.text, lang))
      .map((field) => ({
        contentType: field.contentType,
        contentId: field.contentId,
        field: field.field,
        text: field.text,
        format: field.format,
      }));

    if (!enabled || inputs.length === 0) {
      setMap({});
      setIsTranslating(false);
      setIsTranslated(false);
      return;
    }

    const key = cacheKey(lang, inputs);
    const cached = clientCache.get(key);
    if (cached) {
      setMap(cached);
      setIsTranslating(false);
      setIsTranslated(true);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsTranslating(true);
    setIsTranslated(false);

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLang: lang, fields: inputs }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Translation request failed.");
        return res.json() as Promise<{ translations: TranslationResultMap }>;
      })
      .then(({ translations }) => {
        if (requestId !== requestIdRef.current) return;
        clientCache.set(key, translations);
        setMap(translations);
        setIsTranslated(true);
      })
      .catch((err) => {
        console.error("useTranslationBatch:", err);
        if (requestId !== requestIdRef.current) return;
        setIsTranslated(false);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setIsTranslating(false);
      });
  }, [enabled, flatFields, flatSignature, lang]);

  const getField = (
    contentType: TranslatableContentType,
    contentId: string,
    field: TranslatableField,
    fallback: string,
  ) => {
    const key = translationKey(contentType, contentId, field);
    return map[key] ?? fallback;
  };

  return { getField, isTranslating, isTranslated };
}
