import { cn } from "@/lib/utils";

type ArticleContentProps = {
  html: string;
  className?: string;
};

/** Renders stored article HTML with consistent typography on the public site. */
export function ArticleContent({ html, className }: ArticleContentProps) {
  if (!html?.trim()) return null;

  return (
    <div
      className={cn(
        "article-content prose prose-slate prose-lg md:prose-xl max-w-none text-slate-800",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
