import { describe, expect, it } from "vitest";
import { mergeDiscoveredPages, pagesFromCheckRows, uniquePages } from "@/lib/saved-tests/pages";

const site = "https://example.com";

describe("saved page lists", () => {
  it("saves discovered pages, keeps manually added pages, and rejects duplicate URLs", () => {
    const discovered = Array.from({ length: 12 }, (_, index) => ({
      name: `Page ${index + 1}`,
      url: `/page-${index + 1}`,
      source: "discovered" as const,
    }));
    const saved = uniquePages(site, discovered);
    expect(saved).toHaveLength(12);
    expect(saved[0]?.url).toBe("https://example.com/page-1");

    const withMissing = uniquePages(site, [
      ...saved,
      { name: "Pricing", url: "https://example.com/pricing", source: "manual" },
      { name: "Blog", url: "/blog", source: "manual" },
      { name: "FAQ", url: "https://example.com/faq/", source: "manual" },
    ]);
    expect(withMissing).toHaveLength(15);
    expect(withMissing.filter((page) => page.source === "manual")).toHaveLength(3);

    expect(() =>
      uniquePages(site, [
        { name: "Pricing", url: "https://example.com/pricing", source: "manual" },
        { name: "Pricing again", url: "/pricing/", source: "manual" },
      ]),
    ).toThrow("Each page URL can only be saved once.");
    expect(() => uniquePages(site, [{ name: "Other", url: "https://other.example/pricing", source: "manual" }])).toThrow(
      "same website",
    );
  });

  it("replaces discovered pages and preserves pages that were added manually", () => {
    const current = uniquePages(site, [
      { name: "Home", url: "/", source: "discovered" },
      { name: "Old", url: "/old", source: "discovered" },
      { name: "Extra", url: "/extra", source: "manual" },
    ]);
    const merged = mergeDiscoveredPages(site, current, [
      { name: "Home", url: "https://example.com/", source: "discovered" },
      { name: "Pricing", url: "/pricing", source: "discovered" },
      { name: "Extra", url: "/extra", source: "discovered" },
    ]);

    expect(merged.map((page) => [page.name, page.source])).toEqual([
      ["Home", "discovered"],
      ["Pricing", "discovered"],
      ["Extra", "manual"],
    ]);
  });

  it("builds a discovered list from finished check rows", () => {
    const pages = pagesFromCheckRows(site, [
      { name: "Home", path: "/", url: "https://example.com/login", state: "loaded" },
      { name: "Panel", path: "/pricing", url: "https://example.com/pricing#detail", state: "loaded" },
      { name: "Pricing", path: "/pricing", url: "https://example.com/pricing", state: "failed" },
    ]);
    expect(pages.map((page) => page.url)).toEqual(["https://example.com/", "https://example.com/pricing"]);
    expect(pages[1]?.lastStatus).toBe("failed");
  });
});
