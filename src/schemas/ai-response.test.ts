import { describe, expect, it } from "vitest";
import { aiGenerationResultSchema, extractJsonObject, normalizeAiPayload } from "@/schemas/ai-response";

describe("AI response validation", () => {
  it("normalizes snake_case provider output into the required structure", () => {
    const parsed = aiGenerationResultSchema.parse(
      normalizeAiPayload({
        requirement_summary: "Users reset a password by email.",
        assumptions: "The account already exists",
        clarification_questions: ["Is the email masked?"],
        test_cases: [
          {
            title: "Verify successful reset",
            category: "Positive Testing",
            priority: "high",
            precondition: "User is registered",
            test_steps: [{ action: "Open the reset link", expected_result: "The form is displayed" }],
            test_data: "registered@example.com",
            expected_result: "The password is changed",
            tags: ["Auth"],
          },
        ],
      }),
    );

    expect(parsed.testCases[0]).toMatchObject({
      id: "TC-001",
      priority: "High",
      preconditions: ["User is registered"],
      expectedResult: "The password is changed",
    });
  });

  it("drops duplicate scenarios and rejects an empty result", () => {
    const duplicate = {
      title: "Same case",
      test_steps: [{ action: "Click", expected_result: "Done" }],
    };
    const normalized = normalizeAiPayload({
      requirementSummary: "Summary",
      testCases: [duplicate, duplicate],
    });
    expect(normalized.testCases).toHaveLength(1);
    expect(aiGenerationResultSchema.safeParse(normalizeAiPayload({ testCases: [] })).success).toBe(false);
  });

  it("accepts security, regression, and usability shapes that omit the standard fields", () => {
    const parsed = aiGenerationResultSchema.parse(
      normalizeAiPayload({
        summary: "Login form coverage.",
        testCases: {
          "Security Testing": [
            {
              scenario: "Reject a script in the email field",
              severity: "Critical",
              steps: "1. Enter <script> in email\n2. Submit the form",
              expected: "The script is not executed",
            },
          ],
          "Usability Testing": [
            {
              name: "Confirm the password is readable with the visibility control",
              steps: [{ description: "Select the visibility control", expected: "The password is shown" }],
            },
          ],
          "Regression Testing": [
            {
              test_name: "Existing login still succeeds",
              steps: [{ action: "Sign in with a known account", expected_result: "The dashboard opens" }],
            },
          ],
        },
      }),
    );

    expect(parsed.testCases.map((item) => item.category)).toEqual([
      "Security Testing",
      "Usability Testing",
      "Regression Testing",
    ]);
    expect(parsed.testCases[0]?.testSteps).toHaveLength(2);
    expect(parsed.testCases[0]?.expectedResult).toBe("The script is not executed");
    expect(parsed.testCases[0]?.priority).toBe("Critical");
  });

  it("extracts JSON from a fenced response", () => {
    const value = extractJsonObject('```json\n{"requirementSummary":"Ready"}\n```');
    expect(value).toEqual({ requirementSummary: "Ready" });
  });
});
