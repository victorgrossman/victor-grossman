"use client";

import React, { useEffect } from "react";
import { Article } from "./types";

interface ArticleReaderProps {
  article: Article | null;
  onClose: () => void;
}

export const ArticleReader: React.FC<ArticleReaderProps> = ({
  article,
  onClose,
}) => {
  useEffect(() => {
    if (article) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [article]);

  if (!article) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full h-full md:h-auto md:max-h-[90vh] max-w-4xl bg-white shadow-2xl overflow-y-auto md:rounded-2xl scroll-smooth">
        {/* Sticky Header with Close Button */}
        <div className="sticky top-0 z-50 flex justify-end p-6 pointer-events-none">
          <button
            onClick={onClose}
            className="pointer-events-auto w-10 h-10 md:w-12 md:h-12 bg-white/20 hover:bg-slate-100/40 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-slate-900 md:text-white md:mix-blend-difference transition-all hover:rotate-90 shadow-sm"
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

        {/* Hero Image */}
        <div className="relative h-[40vh] -mt-24">
          {article.image_url ? (
            <img
              src={article.image_url}
              className="w-full h-full object-cover"
              alt={article.title}
            />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
              <span className="text-slate-300 font-serif italic text-6xl">
                VG
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-90" />
        </div>

        {/* Content */}
        <div className="px-6 md:px-12 lg:px-16 -mt-20 md:-mt-32 relative z-10 pb-20">
          <div className="mb-8 md:mb-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-block px-3 py-1 border border-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest bg-white">
                {article.category}
              </span>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                {new Date(article.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold font-serif italic text-slate-900 leading-tight mb-6">
              {article.title}
            </h1>
            <div className="h-1 w-20 bg-blue-600 rounded-full" />
          </div>

          <div className="prose prose-slate prose-lg md:prose-xl max-w-none text-slate-800">
            <div dangerouslySetInnerHTML={{ __html: article.content || "" }} />
          </div>

          {/* Footer of Article */}
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
