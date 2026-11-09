import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/page-check/route";
import { resetRateLimits } from "@/lib/rate-limit";

afterEach(() => {
  resetRateLimits();
});

describe("POST /api/page-check", () => {
  it("rejects a private site before opening a browser", async () => {
    const response = await POST(
      new Request("http://localhost/api/page-check", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
        body: JSON.stringify({ siteUrl: "http://127.0.0.1/dashboard", loginPassword: "secret-value" }),
      }),
      undefined,
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_PAGE_URL");
    expect(JSON.stringify(body)).not.toContain("secret-value");
  });
});
