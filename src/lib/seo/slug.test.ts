import { describe, expect, it } from "vitest";

import {
  contentSlug,
  findByContentSlug,
  matchesContentSlug,
  slugify,
} from "./slug";

describe("SEO slugs", () => {
  it("slugifies titles", () => {
    expect(slugify("Berlin Bulletin #42")).toBe("berlin-bulletin-42");
  });

  it("builds stable content slugs", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(contentSlug("Crossing the River", id)).toBe(
      "crossing-the-river-a1b2c3d4",
    );
  });

  it("matches slug or raw id", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const title = "Test Article";
    expect(matchesContentSlug(title, id, contentSlug(title, id))).toBe(true);
    expect(matchesContentSlug(title, id, id)).toBe(true);
  });

  it("finds item by slug", () => {
    const items = [
      { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", title: "Hello World" },
    ];
    expect(
      findByContentSlug(items, contentSlug("Hello World", items[0].id))?.title,
    ).toBe("Hello World");
  });
});
