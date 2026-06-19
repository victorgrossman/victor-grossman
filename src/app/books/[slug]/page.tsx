import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { SeoPageShell } from "@/components/seo/SeoPageShell";
import { stripHtml } from "@/lib/html";
import { buildBookJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { bookPath, SEO_SECTION_PATHS } from "@/lib/seo/paths";
import { fetchBookBySlug, loadPublicArchive } from "@/lib/seo/public-data";
import { contentSlug } from "@/lib/seo/slug";

export const revalidate = 3600;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { books } = await loadPublicArchive();
  return books.map((b) => ({ slug: contentSlug(b.title, b.id) }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = await fetchBookBySlug(slug);
  if (!book) return { title: "Book not found" };

  const description =
    (book.description && stripHtml(book.description).slice(0, 160)) ||
    `${book.title} by ${book.author} — Victor Grossman publication.`;

  return buildContentMetadata({
    title: book.title,
    description,
    path: bookPath(book),
    image: book.image_url,
    keywords: ["Victor Grossman", book.title, "Victor Grossman book"],
  });
}

export default async function BookDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const book = await fetchBookBySlug(slug);
  if (!book) notFound();

  const path = bookPath(book);
  const description =
    stripHtml(book.description ?? "").slice(0, 200) || book.title;

  return (
    <SeoPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Books", href: SEO_SECTION_PATHS.books },
        { label: book.title },
      ]}
    >
      <JsonLdScript
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Books", path: SEO_SECTION_PATHS.books },
          { name: book.title, path },
        ])}
      />
      <JsonLdScript
        data={buildBookJsonLd({
          title: book.title,
          description,
          path,
          author: book.author,
          image: book.image_url,
          amazonUrl: book.amazon_url,
        })}
      />

      <article className="grid gap-8 md:grid-cols-[240px_1fr]">
        {book.image_url ? (
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100 shadow-md">
            <Image
              src={book.image_url}
              alt={book.title}
              fill
              className="object-cover"
              sizes="240px"
              priority
            />
          </div>
        ) : null}
        <div>
          <h1 className="font-serif text-4xl font-bold italic text-slate-900">
            {book.title}
          </h1>
          <p className="mt-2 text-lg text-slate-600">by {book.author}</p>
          {book.description ? (
            <p className="mt-6 text-lg leading-relaxed text-slate-700">
              {stripHtml(book.description)}
            </p>
          ) : null}
          {book.amazon_url ? (
            <a
              href={book.amazon_url}
              rel="noopener noreferrer"
              target="_blank"
              className="mt-8 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-bold uppercase tracking-widest text-white hover:bg-blue-800"
            >
              View on Amazon
            </a>
          ) : null}
        </div>
      </article>
    </SeoPageShell>
  );
}
