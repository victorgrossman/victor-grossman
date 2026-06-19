import type { MetadataRoute } from "next";

import {
  articlePath,
  bookPath,
  bulletinPath,
  interviewPath,
  SEO_SECTION_PATHS,
} from "@/lib/seo/paths";
import { loadPublicArchive } from "@/lib/seo/public-data";
import { SITE_URL } from "@/lib/seo/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const archive = await loadPublicArchive();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}${SEO_SECTION_PATHS.biography}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${SITE_URL}${SEO_SECTION_PATHS.berlinBulletin}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}${SEO_SECTION_PATHS.articles}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}${SEO_SECTION_PATHS.books}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}${SEO_SECTION_PATHS.interviews}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const bulletinPages: MetadataRoute.Sitemap = archive.bulletins.map((b) => ({
    url: `${SITE_URL}${bulletinPath(b)}`,
    lastModified: new Date(b.published_date ?? b.created_at),
    changeFrequency: "yearly" as const,
    priority: 0.75,
  }));

  const articlePages: MetadataRoute.Sitemap = archive.articles.map((a) => ({
    url: `${SITE_URL}${articlePath(a)}`,
    lastModified: new Date(a.created_at),
    changeFrequency: "yearly" as const,
    priority: 0.7,
  }));

  const bookPages: MetadataRoute.Sitemap = archive.books.map((b) => ({
    url: `${SITE_URL}${bookPath(b)}`,
    lastModified: new Date(b.created_at),
    changeFrequency: "yearly" as const,
    priority: 0.7,
  }));

  const interviewPages: MetadataRoute.Sitemap = archive.interviews.map((i) => ({
    url: `${SITE_URL}${interviewPath(i)}`,
    lastModified: i.created_at ? new Date(i.created_at) : now,
    changeFrequency: "yearly" as const,
    priority: 0.65,
  }));

  return [
    ...staticPages,
    ...bulletinPages,
    ...articlePages,
    ...bookPages,
    ...interviewPages,
  ];
}
