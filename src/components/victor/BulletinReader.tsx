"use client";

import React, { useEffect } from "react";
import { Bulletin } from "./types";

interface BulletinReaderProps {
  bulletin: Bulletin | null;
  onClose: () => void;
  lang: "en" | "de";
}

export const BulletinReader: React.FC<BulletinReaderProps> = ({
  bulletin,
  onClose,
  lang,
}) => {
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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 md:p-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-5 md:right-5 w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:text-slate-900"
          aria-label="Close bulletin"
        >
          <svg
            className="w-5 h-5 mx-auto"
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

        <div className="mb-6 pr-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
              {bulletin.bulletin_number || "Berlin Bulletin"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {new Date(
                bulletin.published_date || bulletin.created_at,
              ).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}
            </span>
          </div>
          <h3 className="text-2xl md:text-4xl font-bold font-serif italic text-slate-900 leading-tight">
            {bulletin.title}
          </h3>
        </div>

        <div className="h-1 w-20 bg-blue-600 rounded-full mb-8" />

        <div className="prose prose-slate max-w-none text-slate-800">
          <p className="whitespace-pre-line leading-relaxed text-base md:text-lg">
            {bulletin.content}
          </p>
        </div>
      </div>
    </div>
  );
};
