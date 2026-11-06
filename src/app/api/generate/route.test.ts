import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/generate/route";
import { resetRateLimits } from "@/lib/rate-limit";

const validBody = {
  requirement: "Users can reset a forgotten password from the login page by email.",
  featureName: "Password reset",
  jiraTicketId: "",
  applicationType: "Web",
  priority: "High",
  categories: ["Positive Testing"],
  testCaseCount: 4,
  detailLevel: "Standard",
  environment: "",
  browserDevice: "",
};

const originalEnv = { ...process.env };

afterEach(() => {
  process.env.AI_API_KEY = originalEnv.AI_API_KEY;
  process.env.AI_MODEL = originalEnv.AI_MODEL;
  process.env.RATE_LIMIT_MAX = originalEnv.RATE_LIMIT_MAX;
  resetRateLimits();
});

describe("POST /api/generate", () => {
  it("rejects an invalid requirement before calling the model", async () => {
    delete process.env.AI_API_KEY;
    const response = await POST(request({ ...validBody, requirement: "short" }), undefined);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a private page URL before opening a browser", async () => {
    const response = await POST(
      request({ ...validBody, pageUrl: "http://127.0.0.1/create-campaign" }),
      undefined,
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_PAGE_URL");
  });

  it("returns a configuration error when the AI key is missing", async () => {
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL;
    const response = await POST(request(validBody), undefined);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("AI_NOT_CONFIGURED");
    expect(JSON.stringify(body)).not.toMatch(/sk-|service_role/i);
  });

  it("rate limits repeated generation requests", async () => {
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL;
    process.env.RATE_LIMIT_MAX = "2";
    resetRateLimits();

    const first = await POST(request(validBody, "198.51.100.10"), undefined);
    const second = await POST(request(validBody, "198.51.100.10"), undefined);
    const third = await POST(request(validBody, "198.51.100.10"), undefined);

    expect(first.status).toBe(503);
    expect(second.status).toBe(503);
    expect(third.status).toBe(429);
  });
});

function request(body: unknown, ip = "203.0.113.8") {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}
