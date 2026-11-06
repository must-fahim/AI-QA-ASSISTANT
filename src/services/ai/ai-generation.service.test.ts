import { afterEach, describe, expect, it } from "vitest";
import { generateTestCases } from "@/services/ai/ai-generation.service";
import type { z } from "zod";
import type { generateRequestSchema } from "@/schemas/records";

type GenerateRequest = z.infer<typeof generateRequestSchema>;

const input: GenerateRequest = {
  requirement: "Users can reset a forgotten password from the login page by email.",
  featureName: "Password reset",
  applicationType: "Web",
  priority: "High",
  categories: ["Positive Testing"],
  testCaseCount: 1,
  detailLevel: "Concise",
};

const originalEnv = { ...process.env };

afterEach(() => {
  process.env.AI_API_KEY = originalEnv.AI_API_KEY;
  process.env.AI_MODEL = originalEnv.AI_MODEL;
  process.env.AI_BASE_URL = originalEnv.AI_BASE_URL;
  process.env.AI_JSON_MODE = originalEnv.AI_JSON_MODE;
});

describe("AI generation service", () => {
  it("requires server configuration before calling a provider", async () => {
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL;
    await expect(generateTestCases(input, { fetchImpl: fetch })).rejects.toMatchObject({
      code: "AI_NOT_CONFIGURED",
      status: 503,
    });
  });

  it("validates a successful provider response", async () => {
    process.env.AI_API_KEY = "test-key";
    process.env.AI_MODEL = "test-model";
    process.env.AI_BASE_URL = "https://example.test/v1";

    const result = await generateTestCases(input, {
      fetchImpl: async (url, init) => {
        expect(String(url)).toBe("https://example.test/v1/chat/completions");
        const body = JSON.parse(String(init?.body));
        expect(body.model).toBe("test-model");
        expect(JSON.stringify(body)).not.toContain("test-key");
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  requirementSummary: "Password reset by email.",
                  assumptions: [],
                  clarificationQuestions: [],
                  testCases: [
                    {
                      title: "Verify reset email is sent",
                      category: "Positive Testing",
                      priority: "High",
                      preconditions: ["Account exists"],
                      testSteps: [{ step: 1, action: "Submit the email", expectedResult: "Email is sent" }],
                      testData: "user@example.com",
                      expectedResult: "A reset email is sent",
                      tags: ["Auth"],
                    },
                  ],
                }),
              },
            },
          ],
        });
      },
    });

    expect(result.model).toBe("test-model");
    expect(result.result.testCases[0]?.id).toBe("TC-001");
  });

  it("reports provider rate limits and invalid JSON", async () => {
    process.env.AI_API_KEY = "test-key";
    process.env.AI_MODEL = "test-model";

    await expect(
      generateTestCases(input, {
        fetchImpl: async () => Response.json({ error: { message: "slow down" } }, { status: 429 }),
      }),
    ).rejects.toMatchObject({ code: "AI_RATE_LIMITED", status: 429 });

    await expect(
      generateTestCases(input, {
        fetchImpl: async () => Response.json({ choices: [{ message: { content: "not json" } }] }),
      }),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });

    let attempts = 0;
    const recovered = await generateTestCases(input, {
      fetchImpl: async (_url, init) => {
        attempts += 1;
        const body = JSON.parse(String(init?.body));
        if (attempts === 1) {
          expect(body.response_format).toEqual({ type: "json_object" });
          return Response.json(
            { error: { message: "Failed to generate JSON. Please adjust your prompt." } },
            { status: 400 },
          );
        }
        expect(body.response_format).toBeUndefined();
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  requirementSummary: "Password reset by email.",
                  assumptions: [],
                  clarificationQuestions: [],
                  testCases: [
                    {
                      title: "Verify reset email is sent",
                      category: "Positive Testing",
                      priority: "High",
                      preconditions: ["Account exists"],
                      testSteps: [{ step: 1, action: "Submit the email", expectedResult: "Email is sent" }],
                      testData: "user@example.com",
                      expectedResult: "A reset email is sent",
                      tags: ["Auth"],
                    },
                  ],
                }),
              },
            },
          ],
        });
      },
    });
    expect(recovered.result.testCases).toHaveLength(1);

    await expect(
      generateTestCases(input, {
        fetchImpl: async () => {
          throw new Error("offline");
        },
      }),
    ).rejects.toMatchObject({ code: "AI_NETWORK_ERROR" });
  });
});
