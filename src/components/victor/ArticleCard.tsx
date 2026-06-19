"use client";

import Link from "next/link";

import { stripHtml } from "@/lib/html";
import { articlePath } from "@/lib/seo/paths";
import { useContentText } from "./ContentTranslationContext";
import { VictorImage } from "./VictorImage";
import { Article } from "./types";

type ArticleCardProps = {
  article: Article;
  lang: "en" | "de";
  showCategory?: boolean;
};

export function ArticleCard({
  article,
  lang,
  showCategory = true,
}: ArticleCardProps) {
  const fallbackExcerpt = article.excerpt
    ? stripHtml(article.excerpt)
    : article.content
      ? stripHtml(article.content).slice(0, 200)
      : lang === "en"
        ? "Read full article..."
        : "Ganzen Artikel lesen…";

  const title = useContentText("article", article.id, "title", article.title);
  const excerpt = useContentText(
    "article",
    article.id,
    "excerpt",
    fallbackExcerpt,
  );

  return (
    <Link
      href={articlePath(article)}
      className="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
        {article.image_url ? (
          <VictorImage
            src={article.image_url}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50 font-serif text-4xl italic text-slate-300">
            VG
          </div>
        )}
        {showCategory && (
          <div className="absolute top-4 left-4">
            <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm backdrop-blur-md">
              {article.category}
            </span>
          </div>
        )}
      </div>
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-[1px] w-8 bg-slate-300" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {new Date(article.created_at).toLocaleDateString(
              lang === "de" ? "de-DE" : "en-US",
            )}
          </span>
        </div>
        <h3 className="mb-3 font-serif text-xl font-bold italic leading-tight transition-colors group-hover:text-blue-600 md:text-2xl">
          {title}
        </h3>
        <p className="line-clamp-3 text-sm font-medium leading-relaxed text-slate-500">
          {excerpt}
        </p>
      </div>
    </Link>
  );
}
