import type { Metadata } from "next";
import Link from "next/link";

import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { SeoPageShell } from "@/components/seo/SeoPageShell";
import { buildBreadcrumbJsonLd, buildPersonJsonLd } from "@/lib/seo/json-ld";
import { buildSectionMetadata } from "@/lib/seo/metadata";
import { SEO_SECTION_PATHS } from "@/lib/seo/paths";
import { PERSON } from "@/lib/seo/site";

export const metadata: Metadata = buildSectionMetadata(
  "Victor Grossman Biography (1928–2025)",
  PERSON.description,
  SEO_SECTION_PATHS.biography,
);

export default function BiographyPage() {
  return (
    <SeoPageShell
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Biography" }]}
    >
      <JsonLdScript
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Biography", path: SEO_SECTION_PATHS.biography },
        ])}
      />
      <JsonLdScript data={buildPersonJsonLd()} />

      <h1 className="font-serif text-4xl font-bold italic text-slate-900 md:text-5xl">
        Victor Grossman — Biography
      </h1>
      <p className="mt-2 text-lg text-slate-500">
        Stephen Wechsler · 1928–2025 · New York to Berlin
      </p>

      <div className="prose prose-slate prose-lg mt-10 max-w-none">
        <p>{PERSON.description}</p>

        <h2>Life and work</h2>
        <p>
          Born Stephen Wechsler in New York City on March 11, 1928, Victor
          Grossman studied economics at Harvard University and journalism at
          Karl Marx University in Leipzig — the only person known to hold degrees
          from both institutions. After defecting across the Danube River in
          August 1952, he lived in East Germany (the GDR) and later reunified
          Berlin as a journalist, author, and translator.
        </p>
        <p>
          For decades he wrote the <strong>Berlin Bulletin</strong>, a
          newsletter read around the world for its eyewitness account of German
          politics, social change, and international affairs. His memoir{" "}
          <em>Crossing the River: A Memoir of the American Left, the Cold War,
          and Life in East Germany</em> remains a landmark account of the Cold
          War from the Eastern side of the divide.
        </p>

        <h2>Memorial archive at victorgrossman.com</h2>
        <p>
          This official memorial site preserves Victor Grossman&apos;s writing,
          images, funeral eulogies (Trauerfeier), and tributes from friends and
          readers. Explore:
        </p>
        <ul>
          <li>
            <Link href={SEO_SECTION_PATHS.berlinBulletin}>
              Berlin Bulletin archive (2017–2025)
            </Link>
          </li>
          <li>
            <Link href={SEO_SECTION_PATHS.articles}>Articles &amp; films</Link>
          </li>
          <li>
            <Link href={SEO_SECTION_PATHS.books}>Books &amp; publications</Link>
          </li>
          <li>
            <Link href={SEO_SECTION_PATHS.interviews}>
              Audio &amp; video interviews
            </Link>
          </li>
        </ul>

        <h2>Key dates</h2>
        <ul>
          <li>
            <strong>Born:</strong> March 11, 1928 — New York City, United States
          </li>
          <li>
            <strong>Died:</strong> December 17, 2025 — Berlin, Germany
          </li>
          <li>
            <strong>Memorial service:</strong> Berlin, January 15, 2026
          </li>
        </ul>

        <h2>Also known as</h2>
        <p>
          Stephen Wechsler, Victor Grossman Berlin, Berlin Bulletin author, GDR
          journalist, American author in East Germany, Harvard and Leipzig
          alumnus.
        </p>

        <h2>External references</h2>
        <ul>
          {PERSON.sameAs.map((url) => (
            <li key={url}>
              <a href={url} rel="noopener noreferrer">
                {url}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </SeoPageShell>
  );
}
