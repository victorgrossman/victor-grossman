import type { Metadata } from "next";
import Link from "next/link";

import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { SeoPageShell } from "@/components/seo/SeoPageShell";
import { buildItemListJsonLd } from "@/lib/seo/json-ld";
import { buildSectionMetadata } from "@/lib/seo/metadata";
import { interviewPath, SEO_SECTION_PATHS } from "@/lib/seo/paths";
import { loadPublicArchive } from "@/lib/seo/public-data";

export const revalidate = 3600;

export const metadata: Metadata = buildSectionMetadata(
  "Victor Grossman Interviews — Audio & Video",
  "Audio and video interviews with Victor Grossman (Stephen Wechsler) on Berlin, East Germany, the Cold War, and a life between Harvard and the GDR.",
  SEO_SECTION_PATHS.interviews,
);

export default async function InterviewsIndexPage() {
  const { interviews } = await loadPublicArchive();
  const listItems = interviews.map((i) => ({
    name: i.title,
    url: interviewPath(i),
  }));

  return (
    <SeoPageShell
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Interviews" }]}
    >
      <JsonLdScript
        data={buildItemListJsonLd(
          "Victor Grossman Interviews",
          SEO_SECTION_PATHS.interviews,
          listItems,
        )}
      />
      <h1 className="font-serif text-4xl font-bold italic text-slate-900">
        Victor Grossman — Interviews
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">
        Recorded conversations with Victor Grossman on politics, history, and
        life in Berlin and East Germany.
      </p>

      <ul className="mt-10 space-y-6">
        {interviews.map((interview) => (
          <li
            key={interview.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <Link
              href={interviewPath(interview)}
              className="font-serif text-2xl font-bold italic text-slate-900 hover:text-blue-700"
            >
              {interview.title}
            </Link>
            <p className="mt-2 text-sm text-slate-500">
              {interview.person}
              {interview.role ? ` · ${interview.role}` : ""}
              {" · "}
              {interview.media_type === "video" ? "Video" : "Audio"}
            </p>
          </li>
        ))}
      </ul>
    </SeoPageShell>
  );
}
