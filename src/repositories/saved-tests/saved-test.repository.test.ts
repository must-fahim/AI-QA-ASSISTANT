import { describe, expect, it } from "vitest";
import { createMemoryClient } from "@/repositories/memory-client";
import {
  createSavedTest,
  deleteSavedTest,
  getSavedTest,
  markSavedTestRun,
  updateSavedTest,
} from "@/repositories/saved-tests/saved-test.repository";

const site = "https://example.com/";

function pages(count: number, source: "discovered" | "manual" = "discovered") {
  return Array.from({ length: count }, (_, index) => ({
    name: `Page ${index + 1}`,
    url: `https://example.com/page-${index + 1}`,
    source,
  }));
}

describe("saved page tests", () => {
  it("stores every page, updates the list, records a retest, and deletes the pages with the test", async () => {
    const client = createMemoryClient();
    const created = await createSavedTest(
      { name: "MUST Company", siteUrl: site, pages: pages(12) },
      client,
    );
    expect(created.pageCount).toBe(12);
    expect(created.pages).toHaveLength(12);

    const updated = await updateSavedTest(
      created.id,
      {
        name: "MUST Company Site",
        siteUrl: "https://example.com",
        pages: [
          ...pages(12),
          { name: "Pricing", url: "/pricing", source: "manual" },
          { name: "Blog", url: "/blog", source: "manual" },
          { name: "FAQ", url: "/faq", source: "manual" },
        ],
      },
      client,
    );
    expect(updated?.name).toBe("MUST Company Site");
    expect(updated?.pageCount).toBe(15);
    expect(updated?.pages.filter((page) => page.source === "discovered")).toHaveLength(12);
    expect(updated?.pages.filter((page) => page.source === "manual")).toHaveLength(3);

    const reloaded = await getSavedTest(created.id, client);
    expect(reloaded?.pages.map((page) => page.url)).toHaveLength(15);

    const tested = await markSavedTestRun(
      created.id,
      [{ url: "https://example.com/page-1", status: "loaded" }],
      client,
    );
    expect(tested?.lastTestedAt).toBeTruthy();
    expect(tested?.pages[0]?.lastStatus).toBe("loaded");

    await expect(
      createSavedTest(
        {
          name: "Duplicate",
          siteUrl: site,
          pages: [
            { name: "One", url: "https://example.com/pricing", source: "manual" },
            { name: "Two", url: "https://example.com/pricing/", source: "manual" },
          ],
        },
        client,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(await deleteSavedTest(created.id, client)).toBe(true);
    expect(await getSavedTest(created.id, client)).toBeNull();
    const leftover = await client.from("saved_page_test_pages").select("*").eq("test_id", created.id);
    expect(leftover.data).toEqual([]);
  });
});
