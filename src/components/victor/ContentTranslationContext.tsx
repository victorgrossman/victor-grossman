"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { fetchStoredTranslations } from "@/lib/content-translations/fetch";
import { pickTranslatedText } from "@/lib/content-translations/resolve";
import type {
  ContentTranslationField,
  ContentTranslationType,
  SiteLang,
  TranslationMap,
} from "@/lib/content-translations/types";
import { supabase, isSupabaseConfigured } from "@/lib/victor/supabase";

type ContentTranslationContextValue = {
  getText: (
    contentType: ContentTranslationType,
    contentId: string,
    field: ContentTranslationField,
    original: string,
  ) => string;
  isLoading: boolean;
};

const ContentTranslationContext =
  createContext<ContentTranslationContextValue | null>(null);

export function ContentTranslationProvider({
  lang,
  children,
}: {
  lang: SiteLang;
  children: React.ReactNode;
}) {
  const [map, setMap] = useState<TranslationMap>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setMap({});
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchStoredTranslations(supabase, lang)
      .then((translations) => {
        if (!cancelled) setMap(translations);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const getText = useCallback(
    (
      contentType: ContentTranslationType,
      contentId: string,
      field: ContentTranslationField,
      original: string,
    ) => pickTranslatedText(contentType, contentId, field, original, lang, map),
    [lang, map],
  );

  const value = useMemo(
    () => ({ getText, isLoading }),
    [getText, isLoading],
  );

  return (
    <ContentTranslationContext.Provider value={value}>
      {children}
    </ContentTranslationContext.Provider>
  );
}

export function useContentText(
  contentType: ContentTranslationType,
  contentId: string,
  field: ContentTranslationField,
  original: string,
): string {
  const ctx = useContext(ContentTranslationContext);
  if (!ctx) return original;
  return ctx.getText(contentType, contentId, field, original);
}
