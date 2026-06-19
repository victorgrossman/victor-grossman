"use client";

import Link from "next/link";

import { plainExcerpt } from "@/lib/content-translations/resolve";
import { bulletinPath } from "@/lib/seo/paths";
import { useContentText } from "./ContentTranslationContext";
import { Bulletin } from "./types";

type BulletinCardProps = {
  bulletin: Bulletin;
  lang: "en" | "de";
  readLabel: string;
  compact?: boolean;
};

export function BulletinCard({
  bulletin,
  lang,
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
    <Link
      href={bulletinPath(bulletin)}
      className="block cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg md:p-8"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
        className={`mb-3 font-serif font-bold italic leading-tight text-slate-900 ${
          compact ? "text-xl md:text-2xl" : "text-2xl"
        }`}
      >
        {title}
      </h3>
      <p className="line-clamp-5 leading-relaxed text-slate-600">{preview}</p>
      <div className="mt-5 flex items-center gap-2 text-blue-600">
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
          {readLabel}
        </span>
        <svg
          className="h-4 w-4"
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
    </Link>
  );
}
