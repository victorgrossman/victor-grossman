"use client";

import { useEffect, useState } from "react";

import { supabase, isSupabaseConfigured } from "@/lib/victor/supabase";

type ContentTable = "articles" | "bulletins";

export function useRecordContent(
  table: ContentTable,
  recordId: string | undefined,
  initialContent?: string | null,
) {
  const [content, setContent] = useState(initialContent ?? "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!recordId) {
      setContent("");
      setIsLoading(false);
      return;
    }

    if (initialContent?.trim()) {
      setContent(initialContent);
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) return;

    let cancelled = false;
    setIsLoading(true);

    void (async () => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("content")
          .eq("id", recordId)
          .single();

        if (cancelled) return;
        if (error) {
          console.error(`useRecordContent(${table}):`, error.message);
          return;
        }
        setContent(data?.content ?? "");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [table, recordId, initialContent]);

  return { content, isLoading };
}
