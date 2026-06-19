import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleContent } from "@/components/victor/ArticleContent";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { SeoPageShell } from "@/components/seo/SeoPageShell";
import { stripHtml } from "@/lib/html";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { articlePath, SEO_SECTION_PATHS } from "@/lib/seo/paths";
import { fetchArticleBySlug, loadPublicArchive } from "@/lib/seo/public-data";
import { contentSlug } from "@/lib/seo/slug";

export const revalidate = 3600;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { articles } = await loadPublicArchive();
  return articles.map((a) => ({ slug: contentSlug(a.title, a.id) }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);
  if (!article) return { title: "Article not found" };

  const description =
    (article.excerpt && stripHtml(article.excerpt).slice(0, 160)) ||
    stripHtml(article.content ?? "").slice(0, 160) ||
    `Article by Victor Grossman: ${article.title}`;

  return buildContentMetadata({
    title: article.title,
    description,
    path: articlePath(article),
    image: article.image_url,
    publishedTime: article.created_at,
    keywords: [
      "Victor Grossman",
      article.title,
      article.category ?? "article",
    ],
  });
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);
  if (!article) notFound();

  const path = articlePath(article);
  const description =
    stripHtml(article.excerpt ?? article.content ?? "").slice(0, 200) ||
    article.title;

  return (
    <SeoPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Articles", href: SEO_SECTION_PATHS.articles },
        { label: article.title },
      ]}
    >
      <JsonLdScript
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Articles", path: SEO_SECTION_PATHS.articles },
          { name: article.title, path },
        ])}
      />
      <JsonLdScript
        data={buildArticleJsonLd({
          title: article.title,
          description,
          path,
          datePublished: article.created_at,
          image: article.image_url,
          author: article.author,
        })}
      />

      <article>
        {article.category ? (
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
            {article.category}
          </p>
        ) : null}
        <h1 className="mt-2 font-serif text-4xl font-bold italic text-slate-900">
          {article.title}
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {new Date(article.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {article.author ? ` · ${article.author}` : null}
        </p>
        <div className="mt-8">
          <ArticleContent html={article.content ?? ""} />
        </div>
      </article>
    </SeoPageShell>
  );
}
