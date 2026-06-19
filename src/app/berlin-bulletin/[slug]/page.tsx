import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleContent } from "@/components/victor/ArticleContent";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { SeoPageShell } from "@/components/seo/SeoPageShell";
import { stripHtml } from "@/lib/html";
import {
  buildBreadcrumbJsonLd,
  buildNewsArticleJsonLd,
} from "@/lib/seo/json-ld";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { bulletinPath, SEO_SECTION_PATHS } from "@/lib/seo/paths";
import { fetchBulletinBySlug, loadPublicArchive } from "@/lib/seo/public-data";
import { contentSlug } from "@/lib/seo/slug";

export const revalidate = 3600;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { bulletins } = await loadPublicArchive();
  return bulletins.map((b) => ({ slug: contentSlug(b.title, b.id) }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const bulletin = await fetchBulletinBySlug(slug);
  if (!bulletin) return { title: "Bulletin not found" };

  const description =
    stripHtml(bulletin.content ?? "").slice(0, 160) ||
    `Berlin Bulletin by Victor Grossman: ${bulletin.title}`;

  return buildContentMetadata({
    title: `${bulletin.bulletin_number ? `${bulletin.bulletin_number} — ` : ""}${bulletin.title}`,
    description,
    path: bulletinPath(bulletin),
    publishedTime: bulletin.published_date ?? bulletin.created_at,
    keywords: [
      "Victor Grossman",
      "Berlin Bulletin",
      bulletin.title,
      bulletin.bulletin_number ?? "",
    ].filter(Boolean),
  });
}

export default async function BulletinDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const bulletin = await fetchBulletinBySlug(slug);
  if (!bulletin) notFound();

  const path = bulletinPath(bulletin);
  const description =
    stripHtml(bulletin.content ?? "").slice(0, 200) || bulletin.title;
  const dateLabel = new Date(
    bulletin.published_date || bulletin.created_at,
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <SeoPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Berlin Bulletin", href: SEO_SECTION_PATHS.berlinBulletin },
        { label: bulletin.title },
      ]}
    >
      <JsonLdScript
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Berlin Bulletin", path: SEO_SECTION_PATHS.berlinBulletin },
          { name: bulletin.title, path },
        ])}
      />
      <JsonLdScript
        data={buildNewsArticleJsonLd({
          title: bulletin.title,
          description,
          path,
          datePublished: bulletin.published_date ?? bulletin.created_at,
          bulletinNumber: bulletin.bulletin_number,
        })}
      />

      <article>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
          {bulletin.bulletin_number || "Berlin Bulletin"}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold italic text-slate-900">
          {bulletin.title}
        </h1>
        <p className="mt-3 text-sm text-slate-500">{dateLabel}</p>
        <div className="mt-8">
          <ArticleContent html={bulletin.content ?? ""} />
        </div>
      </article>
    </SeoPageShell>
  );
}
