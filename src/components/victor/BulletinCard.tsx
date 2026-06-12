"use client";

import { useContentText } from "./ContentTranslationContext";
import { plainExcerpt } from "@/lib/content-translations/resolve";
import { Bulletin } from "./types";

type BulletinCardProps = {
  bulletin: Bulletin;
  lang: "en" | "de";
  onClick: () => void;
  readLabel: string;
  compact?: boolean;
};

export function BulletinCard({
  bulletin,
  lang,
  onClick,
  readLabel,
  compact = false,
}: BulletinCardProps) {
  const title = useContentText(
    "bulletin",
    bulletin.id,
    "title",
    bulletin.title,
  );
  const preview = useContentText(
    "bulletin",
    bulletin.id,
    "excerpt",
    bulletin.content ? plainExcerpt(bulletin.content) : "",
  );

  return (
    <article
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
          {bulletin.bulletin_number || "Berlin Bulletin"}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {new Date(
            bulletin.published_date || bulletin.created_at,
          ).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", {
            year: "numeric",
            month: compact ? "short" : "long",
            day: "numeric",
          })}
        </span>
      </div>
      <h3
        className={`font-bold font-serif italic text-slate-900 mb-3 leading-tight ${
          compact ? "text-xl md:text-2xl" : "text-2xl"
        }`}
      >
        {title}
      </h3>
      <p className="text-slate-600 leading-relaxed line-clamp-5">{preview}</p>
      <div className="mt-5 flex items-center gap-2 text-blue-600">
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
          {readLabel}
        </span>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </article>
  );
}
