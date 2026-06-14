"use client";

import React, { useEffect } from "react";

import { useRecordContent } from "@/lib/victor/use-record-content";

import { ArticleContent } from "./ArticleContent";
import { useContentText } from "./ContentTranslationContext";
import { Bulletin } from "./types";

interface BulletinReaderProps {
  bulletin: Bulletin | null;
  onClose: () => void;
  lang: "en" | "de";
}

function isHtmlContent(text: string) {
  return /<[a-z][\s\S]*>/i.test(text);
}

export const BulletinReader: React.FC<BulletinReaderProps> = ({
  bulletin,
  onClose,
  lang,
}) => {
  const { content: loadedContent, isLoading } = useRecordContent(
    "bulletins",
    bulletin?.id,
    bulletin?.content,
  );

  const title = useContentText(
    "bulletin",
    bulletin?.id ?? "",
    "title",
    bulletin?.title ?? "",
  );
  const content = useContentText(
    "bulletin",
    bulletin?.id ?? "",
    "content",
    loadedContent,
  );

  useEffect(() => {
    if (bulletin) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [bulletin]);

  if (!bulletin) return null;

  const badgeLabel = bulletin.bulletin_number || "Berlin Bulletin";
  const dateLabel = new Date(
    bulletin.published_date || bulletin.created_at,
  ).toLocaleDateString(lang === "de" ? "de-DE" : "en-US");

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full h-full md:h-auto md:max-h-[90vh] max-w-4xl bg-white shadow-2xl overflow-y-auto md:rounded-2xl scroll-smooth">
        <div className="sticky top-0 z-50 flex justify-end p-6 pointer-events-none">
          <button
            onClick={onClose}
            className="pointer-events-auto w-10 h-10 md:w-12 md:h-12 bg-slate-100/90 hover:bg-slate-200/90 md:bg-white/20 md:hover:bg-slate-100/40 backdrop-blur-md border border-slate-200 md:border-white/30 rounded-full flex items-center justify-center text-slate-900 md:text-white md:mix-blend-difference transition-all hover:rotate-90 shadow-sm"
            aria-label="Close bulletin"
          >
            <svg
              className="w-5 h-5 md:w-6 md:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 md:px-12 lg:px-16 pt-2 md:pt-0 pb-20 relative z-10">
          <div className="mb-8 md:mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="inline-block px-3 py-1 border border-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest bg-white">
                {badgeLabel}
              </span>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                {dateLabel}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold font-serif italic text-slate-900 leading-tight mb-6">
              {title}
            </h1>
            <div className="h-1 w-20 bg-blue-600 rounded-full" />
          </div>

          {isLoading && !content.trim() ? (
            <p className="text-sm text-slate-500 animate-pulse">Loading…</p>
          ) : isHtmlContent(content) ? (
            <ArticleContent html={content} />
          ) : (
            <div className="article-content prose prose-slate prose-lg md:prose-xl max-w-none text-slate-800">
              <p className="whitespace-pre-line leading-relaxed">{content}</p>
            </div>
          )}

          <div className="mt-16 pt-10 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
              Victor Grossman Archive
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
