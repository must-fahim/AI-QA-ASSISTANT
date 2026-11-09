import { describe, expect, it } from "vitest";
import { createMemoryClient } from "@/repositories/memory-client";
import { updateTestCase } from "@/repositories/test-cases/test-case.repository";
import {
  createTestSuite,
  deleteTestSuite,
  getTestSuite,
  listTestSuites,
  updateTestSuite,
} from "@/repositories/test-suites/test-suite.repository";

describe("test suite repository", () => {
  it("creates, lists, updates, and deletes suites and cases", async () => {
    const client = createMemoryClient();
    const created = await createTestSuite(suiteInput(), "user-a", client);

    expect(created.testCases).toHaveLength(1);
    expect(created.testCases[0]?.recordId).toBeTruthy();
    expect(created.jiraTicketId).toBe("AUTH-124");

    const listed = await listTestSuites("user-a", client);
    expect(listed.stats).toMatchObject({
      totalGenerations: 1,
      totalTestCases: 1,
      totalSavedTestSuites: 1,
      averageGenerationTimeMs: 1800,
    });

    const recordId = created.testCases[0]?.recordId ?? "";
    const updatedCase = await updateTestCase(recordId, { title: "Updated reset title", tags: [" Auth ", "Auth"] }, client);
    expect(updatedCase.title).toBe("Updated reset title");
    expect(updatedCase.tags).toEqual(["Auth"]);

    const renamed = await updateTestSuite(created.id, { title: "Account recovery", jiraTicketId: null }, "user-a", client);
    expect(renamed?.title).toBe("Account recovery");
    expect(renamed?.jiraTicketId).toBeNull();
    expect(renamed?.testCases[0]?.title).toBe("Updated reset title");

    await deleteTestSuite(created.id, "user-a", client);
    expect(await getTestSuite(created.id, "user-a", client)).toBeNull();
    expect((await listTestSuites("user-a", client)).suites).toHaveLength(0);
  });

  it("rejects a duplicate test case id inside one suite", async () => {
    const client = createMemoryClient();
    const input = suiteInput();
    input.testCases = [input.testCases[0], { ...input.testCases[0] }];
    await expect(createTestSuite(input, "user-a", client)).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect((await listTestSuites("user-a", client)).suites).toHaveLength(0);
  });
});

function suiteInput(): CreateInput {
  return {
    title: "Password reset",
    requirement: "Users can reset a forgotten password from the login page by email.",
    jiraTicketId: "AUTH-124",
    configuration: {
      featureName: "Password reset",
      applicationType: "Web",
      priority: "High",
      categories: ["Positive Testing"],
      testCaseCount: 1,
      detailLevel: "Standard",
      generationDurationMs: 1800,
    },
    requirementSummary: "Password reset by email.",
    assumptions: ["The user already has an account."],
    clarificationQuestions: [],
    testCases: [
      {
        id: "TC-001",
        title: "Verify reset email",
        category: "Positive Testing",
        priority: "High",
        preconditions: ["Account exists"],
        testSteps: [{ step: 1, action: "Submit the email", expectedResult: "Email is sent" }],
        testData: "user@example.com",
        expectedResult: "A reset email is sent",
        tags: ["Auth"],
      },
    ],
  };
}

type CreateInput = Parameters<typeof createTestSuite>[0];
