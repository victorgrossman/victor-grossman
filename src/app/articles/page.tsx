import type { Metadata } from "next";
import Link from "next/link";

import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { SeoPageShell } from "@/components/seo/SeoPageShell";
import { buildItemListJsonLd } from "@/lib/seo/json-ld";
import { buildSectionMetadata } from "@/lib/seo/metadata";
import { articlePath, SEO_SECTION_PATHS } from "@/lib/seo/paths";
import { loadPublicArchive } from "@/lib/seo/public-data";
import { stripHtml } from "@/lib/html";

export const revalidate = 3600;

export const metadata: Metadata = buildSectionMetadata(
  "Victor Grossman Articles & Films",
  "Articles, essays, and documentary films about and by Victor Grossman (Stephen Wechsler), American journalist in East Germany and Berlin.",
  SEO_SECTION_PATHS.articles,
);

export default async function ArticlesIndexPage() {
  const { articles } = await loadPublicArchive();

  const listItems = articles.map((a) => ({
    name: a.title,
    url: articlePath(a),
  }));

  return (
    <SeoPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Articles & Films" },
      ]}
    >
      <JsonLdScript
        data={buildItemListJsonLd(
          "Victor Grossman Articles",
          SEO_SECTION_PATHS.articles,
          listItems,
        )}
      />
      <h1 className="font-serif text-4xl font-bold italic text-slate-900">
        Victor Grossman — Articles &amp; Films
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">
        Essays, journalism, and films featuring Victor Grossman (Stephen
        Wechsler), chronicler of Berlin and East Germany.
      </p>

      <ul className="mt-10 space-y-6">
        {articles.map((article) => (
          <li
            key={article.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <Link
              href={articlePath(article)}
              className="font-serif text-2xl font-bold italic text-slate-900 hover:text-blue-700"
            >
              {article.title}
            </Link>
            {article.category ? (
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                {article.category}
              </p>
            ) : null}
            {article.excerpt ? (
              <p className="mt-3 text-slate-600 leading-relaxed">
                {stripHtml(article.excerpt).slice(0, 280)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </SeoPageShell>
  );
}
