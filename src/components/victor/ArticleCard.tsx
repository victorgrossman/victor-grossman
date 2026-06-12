"use client";

import { stripHtml } from "@/lib/html";
import { Article } from "./types";

type ArticleCardProps = {
  article: Article;
  lang: "en" | "de";
  onClick: () => void;
  showCategory?: boolean;
};

export function ArticleCard({
  article,
  lang,
  onClick,
  showCategory = true,
}: ArticleCardProps) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300"
    >
      <div className="aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden relative">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 font-serif italic text-4xl">
            VG
          </div>
        )}
        {showCategory && (
          <div className="absolute top-4 left-4">
            <span className="bg-white/95 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
              {article.category}
            </span>
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-[1px] bg-slate-300" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {new Date(article.created_at).toLocaleDateString(
              lang === "de" ? "de-DE" : "en-US",
            )}
          </span>
        </div>
        <h3 className="text-xl md:text-2xl font-bold font-serif italic mb-3 leading-tight group-hover:text-blue-600 transition-colors">
          {article.title}
        </h3>
        <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed font-medium">
          {article.excerpt
            ? stripHtml(article.excerpt)
            : stripHtml(article.content).slice(0, 200) ||
              (lang === "en" ? "Read full article..." : "Ganzen Artikel lesen…")}
        </p>
      </div>
    </div>
  );
}
