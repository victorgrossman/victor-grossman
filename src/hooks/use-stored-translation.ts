"use client";

import { useSyncExternalStore } from "react";

import { translationStore } from "@/lib/translation/client-store";
import type {
  SiteLang,
  TranslatableContentType,
  TranslatableField,
} from "@/lib/translation/types";

export function useStoredTranslation(
  contentType: TranslatableContentType,
  contentId: string,
  field: TranslatableField,
  original: string,
  lang: SiteLang,
): string {
  return useSyncExternalStore(
    translationStore.subscribe,
    () =>
      translationStore.getField(
        contentType,
        contentId,
        field,
        original,
        lang,
      ),
    () => original,
  );
}
