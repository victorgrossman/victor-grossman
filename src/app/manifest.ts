import type { MetadataRoute } from "next";

import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Victor Grossman",
    description:
      "Official memorial and Berlin Bulletin archive for Victor Grossman (1928–2025).",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#0f172a",
    lang: "en",
    id: SITE_URL,
  };
}
