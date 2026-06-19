import type { Metadata } from "next";
import Link from "next/link";

import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { SeoPageShell } from "@/components/seo/SeoPageShell";
import { buildItemListJsonLd } from "@/lib/seo/json-ld";
import { buildSectionMetadata } from "@/lib/seo/metadata";
import { bulletinPath, SEO_SECTION_PATHS } from "@/lib/seo/paths";
import { loadPublicArchive } from "@/lib/seo/public-data";

export const revalidate = 3600;

export const metadata: Metadata = buildSectionMetadata(
  "Berlin Bulletin Archive — Victor Grossman",
  "Complete Berlin Bulletin archive by Victor Grossman (2017–2025): newsletters on Berlin, Germany, and world events from an American journalist in East Germany.",
  SEO_SECTION_PATHS.berlinBulletin,
);

export default async function BerlinBulletinIndexPage() {
  const { bulletins } = await loadPublicArchive();

  const listItems = bulletins.map((b) => ({
    name: b.title,
    url: bulletinPath(b),
  }));

  return (
    <SeoPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Berlin Bulletin" },
      ]}
    >
      <JsonLdScript
        data={buildItemListJsonLd(
          "Berlin Bulletin by Victor Grossman",
          SEO_SECTION_PATHS.berlinBulletin,
          listItems,
        )}
      />
      <h1 className="font-serif text-4xl font-bold italic text-slate-900">
        Berlin Bulletin — Victor Grossman
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">
        The Berlin Bulletin was Victor Grossman&apos;s newsletter on politics,
        history, and daily life in Berlin and Germany. This archive covers
        issues from 2017 through 2025.
      </p>

      <ul className="mt-10 space-y-6">
        {bulletins.map((bulletin) => (
          <li
            key={bulletin.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-widest text-blue-600">
              <span>{bulletin.bulletin_number || "Berlin Bulletin"}</span>
              <span className="text-slate-400">
                {new Date(
                  bulletin.published_date || bulletin.created_at,
                ).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <Link
              href={bulletinPath(bulletin)}
              className="mt-3 block font-serif text-2xl font-bold italic text-slate-900 hover:text-blue-700"
            >
              {bulletin.title}
            </Link>
          </li>
        ))}
      </ul>
    </SeoPageShell>
  );
}
