import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl, isPrivateAddress } from "@/lib/page-visit/public-url";

describe("public page URLs", () => {
  it("rejects local and private addresses", async () => {
    await expect(assertPublicHttpUrl("http://localhost/create")).rejects.toMatchObject({
      code: "INVALID_PAGE_URL",
    });
    await expect(assertPublicHttpUrl("http://127.0.0.1/create")).rejects.toMatchObject({
      code: "INVALID_PAGE_URL",
    });
    await expect(assertPublicHttpUrl("https://192.168.0.8/create")).rejects.toMatchObject({
      code: "INVALID_PAGE_URL",
    });
    await expect(assertPublicHttpUrl("file:///tmp/form.html")).rejects.toMatchObject({
      code: "INVALID_PAGE_URL",
    });
  });

  it("recognizes private IP ranges", () => {
    expect(isPrivateAddress("10.1.1.1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });
});
