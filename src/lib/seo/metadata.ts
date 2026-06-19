import type { Metadata } from "next";

import { PERSON, SITE_NAME, SITE_URL } from "./site";

type ContentMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  publishedTime?: string;
  modifiedTime?: string;
  keywords?: string[];
};

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function buildContentMetadata({
  title,
  description,
  path,
  image,
  publishedTime,
  modifiedTime,
  keywords,
}: ContentMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const ogImage = image?.trim() || PERSON.heroImage;
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "en_US",
      alternateLocale: ["de_DE"],
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [{ url: ogImage, alt: title }],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}

export function buildSectionMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return buildContentMetadata({ title, description, path });
}
