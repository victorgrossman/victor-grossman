import { describe, expect, it } from "vitest";

import { detectLang, needsTranslation } from "./detect-lang";

describe("detectLang", () => {
  it("detects German text", () => {
    expect(
      detectLang(
        "Der Berlin Bulletin berichtet über die Entwicklungen in der Hauptstadt.",
      ),
    ).toBe("de");
  });

  it("detects English text", () => {
    expect(
      detectLang(
        "The Berlin Bulletin reports on developments in the capital city this week.",
      ),
    ).toBe("en");
  });
});

describe("needsTranslation", () => {
  it("skips when target matches detected language", () => {
    expect(needsTranslation("The weekly report from Berlin.", "en")).toBe(false);
    expect(
      needsTranslation("Der wöchentliche Bericht aus Berlin.", "de"),
    ).toBe(false);
  });

  it("translates when languages differ", () => {
    expect(needsTranslation("The weekly report from Berlin.", "de")).toBe(true);
    expect(
      needsTranslation("Der wöchentliche Bericht aus Berlin.", "en"),
    ).toBe(true);
  });
});
