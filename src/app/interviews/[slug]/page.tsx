import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleContent } from "@/components/victor/ArticleContent";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { SeoPageShell } from "@/components/seo/SeoPageShell";
import { stripHtml } from "@/lib/html";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { interviewPath, SEO_SECTION_PATHS } from "@/lib/seo/paths";
import { fetchInterviewBySlug, loadPublicArchive } from "@/lib/seo/public-data";
import { contentSlug } from "@/lib/seo/slug";

export const revalidate = 3600;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { interviews } = await loadPublicArchive();
  return interviews.map((i) => ({ slug: contentSlug(i.title, i.id) }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const interview = await fetchInterviewBySlug(slug);
  if (!interview) return { title: "Interview not found" };

  const description =
    (interview.content && stripHtml(interview.content).slice(0, 160)) ||
    `${interview.title} — interview with Victor Grossman.`;

  return buildContentMetadata({
    title: interview.title,
    description,
    path: interviewPath(interview),
    image: interview.image_url,
    keywords: ["Victor Grossman", "Victor Grossman interview", interview.title],
  });
}

export default async function InterviewDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const interview = await fetchInterviewBySlug(slug);
  if (!interview) notFound();

  const path = interviewPath(interview);
  const description =
    stripHtml(interview.content ?? "").slice(0, 200) || interview.title;

  return (
    <SeoPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Interviews", href: SEO_SECTION_PATHS.interviews },
        { label: interview.title },
      ]}
    >
      <JsonLdScript
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Interviews", path: SEO_SECTION_PATHS.interviews },
          { name: interview.title, path },
        ])}
      />
      <JsonLdScript
        data={buildArticleJsonLd({
          title: interview.title,
          description,
          path,
          datePublished: interview.created_at ?? new Date().toISOString(),
          image: interview.image_url,
          author: interview.person,
        })}
      />

      <article>
        <h1 className="font-serif text-4xl font-bold italic text-slate-900">
          {interview.title}
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {interview.person}
          {interview.role ? ` · ${interview.role}` : ""}
          {interview.location_meta ? ` · ${interview.location_meta}` : ""}
        </p>

        {interview.media_url ? (
          <div className="mt-8 overflow-hidden rounded-xl bg-black">
            {interview.media_type === "video" ? (
              <video
                controls
                className="w-full"
                src={interview.media_url}
                poster={interview.image_url ?? undefined}
              />
            ) : (
              <audio controls className="w-full p-4" src={interview.media_url} />
            )}
          </div>
        ) : null}

        {interview.content ? (
          <div className="mt-8">
            <ArticleContent html={interview.content} />
          </div>
        ) : null}
      </article>
    </SeoPageShell>
  );
}
