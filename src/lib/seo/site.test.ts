import { describe, expect, it } from "vitest";

import { buildHomeJsonLdGraph } from "./json-ld";
import { DEFAULT_TITLE, PERSON, SITE_URL } from "./site";

describe("SEO site config", () => {
  it("includes Victor Grossman in default title", () => {
    expect(DEFAULT_TITLE).toContain("Victor Grossman");
  });

  it("defines canonical site URL", () => {
    expect(SITE_URL).toMatch(/^https:\/\//);
  });

  it("includes Wikipedia in sameAs links", () => {
    expect(PERSON.sameAs.some((url) => url.includes("wikipedia"))).toBe(true);
  });
});

describe("JSON-LD graph", () => {
  it("includes Organization in home graph", () => {
    const graph = buildHomeJsonLdGraph();
    const types = (graph["@graph"] as { "@type": string }[]).map(
      (node) => node["@type"],
    );
    expect(types).toContain("Person");
    expect(types).toContain("WebSite");
    expect(types).toContain("ProfilePage");
    expect(types).toContain("Organization");
  });
});
