import { describe, expect, it } from "vitest";

import { hasMeaningfulHtml, stripHtml } from "./html";

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });
});

describe("hasMeaningfulHtml", () => {
  it("rejects empty editor output", () => {
    expect(hasMeaningfulHtml("<p></p>")).toBe(false);
    expect(hasMeaningfulHtml("<p><br></p>")).toBe(false);
  });

  it("accepts real content", () => {
    expect(hasMeaningfulHtml("<h2>Title</h2><p>Body</p>")).toBe(true);
  });
});
