import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges tailwind classes and keeps the latest conflicting utility", () => {
    expect(cn("p-2", "p-4", "text-sm", false && "hidden")).toBe("p-4 text-sm");
  });

  it("supports conditional class values", () => {
    const isActive = true;
    expect(cn("base", isActive && "active", !isActive && "inactive")).toBe(
      "base active",
    );
  });
});
