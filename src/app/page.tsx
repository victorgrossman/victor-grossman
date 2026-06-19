import VictorApp from "@/components/victor/App";
import { CrawlableArchiveIndex } from "@/components/seo/CrawlableArchiveIndex";
import { CrawlableIntro } from "@/components/seo/CrawlableIntro";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { buildHomeJsonLdGraph } from "@/lib/seo/json-ld";
import { loadPublicArchive } from "@/lib/seo/public-data";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_URL,
} from "@/lib/seo/site";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
};

export default async function Home() {
  const archive = await loadPublicArchive();

  return (
    <>
      <JsonLdScript data={buildHomeJsonLdGraph()} />
      <CrawlableIntro />
      <CrawlableArchiveIndex archive={archive} />
      <VictorApp />
    </>
  );
}
