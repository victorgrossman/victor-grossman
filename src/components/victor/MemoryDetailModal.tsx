"use client";

import React, { useEffect } from "react";

import { VictorImage } from "./VictorImage";
import { Memory } from "./types";

interface MemoryDetailModalProps {
  memory: Memory | null;
  onClose: () => void;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({
  memory,
  onClose,
}) => {
  useEffect(() => {
    if (memory) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [memory]);

  if (!memory) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full h-full md:h-auto md:max-h-[90vh] max-w-4xl bg-white shadow-2xl overflow-y-auto md:rounded-2xl scroll-smooth">
        <div className="sticky top-0 z-50 flex justify-end p-6 pointer-events-none">
          <button
            onClick={onClose}
            className="pointer-events-auto w-10 h-10 md:w-12 md:h-12 bg-slate-100/90 hover:bg-slate-200/90 md:bg-white/20 md:hover:bg-slate-100/40 backdrop-blur-md border border-slate-200 md:border-white/30 rounded-full flex items-center justify-center text-slate-900 md:text-white md:mix-blend-difference transition-all hover:rotate-90 shadow-sm"
            aria-label="Close memory"
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
                Memory
              </span>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                {memory.date}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div
                className={`shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl ${memory.color} flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md`}
              >
                {memory.initials}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold font-serif italic text-slate-900 leading-tight">
                {memory.author}
              </h1>
            </div>

            <div className="h-1 w-20 bg-blue-600 rounded-full" />
          </div>

          {memory.image && (
            <div className="relative w-full aspect-[4/3] md:aspect-[16/10] rounded-2xl overflow-hidden mb-8 md:mb-10 bg-slate-100">
              <VictorImage
                src={memory.image}
                alt={`Memory by ${memory.author}`}
                fill
                sizes="(max-width: 768px) 100vw, 896px"
                className="object-cover"
              />
            </div>
          )}

          <div className="article-content prose prose-slate prose-lg md:prose-xl max-w-none text-slate-800">
            <p className="font-serif italic leading-relaxed whitespace-pre-line">
              &ldquo;{memory.message}&rdquo;
            </p>
          </div>

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
