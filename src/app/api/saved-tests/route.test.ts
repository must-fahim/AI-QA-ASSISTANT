import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/saved-tests/route";
import { resetRateLimits } from "@/lib/rate-limit";

afterEach(() => {
  resetRateLimits();
});

describe("POST /api/saved-tests", () => {
  it("rejects a private website before writing to the database", async () => {
    const response = await POST(
      new Request("http://localhost/api/saved-tests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Local",
          siteUrl: "http://127.0.0.1",
          pages: [{ name: "Home", url: "http://127.0.0.1/", source: "manual" }],
        }),
      }),
      undefined,
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_PAGE_URL");
  });

  it("rejects an invalid page list", async () => {
    const response = await POST(
      new Request("http://localhost/api/saved-tests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "", siteUrl: "https://example.com", pages: [] }),
      }),
      undefined,
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
