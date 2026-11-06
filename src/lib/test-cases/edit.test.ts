import { describe, expect, it } from "vitest";
import { applyTestCasePatch } from "@/lib/test-cases/edit";
import { updateTestCaseSchema } from "@/schemas/records";
import type { EditableTestCase } from "@/types/domain";

const testCase: EditableTestCase = {
  recordId: "8d8a0c4e-4b7e-4e2a-9c1a-2b7e6d5c4a11",
  id: "TC-001",
  title: "Original title",
  category: "Positive Testing",
  priority: "Medium",
  preconditions: ["Account exists"],
  testSteps: [
    { step: 4, action: "Open the page", expectedResult: "Page is shown" },
    { step: 9, action: "Submit", expectedResult: "Request succeeds" },
  ],
  testData: "user@example.com",
  expectedResult: "The account is updated",
  tags: ["Auth"],
};

describe("test case editing", () => {
  it("renumbers steps and removes blank or duplicate tags", () => {
    const next = applyTestCasePatch(testCase, {
      title: "  Updated title  ",
      testSteps: [
        { step: 8, action: " Open settings ", expectedResult: " Settings are visible " },
        { step: 2, action: "Save", expectedResult: "Changes persist" },
      ],
      tags: [" Auth ", "Auth", " "],
      preconditions: [" Account exists ", ""],
    });

    expect(next.title).toBe("Updated title");
    expect(next.testSteps.map((step) => step.step)).toEqual([1, 2]);
    expect(next.testSteps[0]?.action).toBe("Open settings");
    expect(next.tags).toEqual(["Auth"]);
    expect(next.preconditions).toEqual(["Account exists"]);
    expect(next.id).toBe("TC-001");
  });

  it("rejects an empty edit and an empty title", () => {
    expect(updateTestCaseSchema.safeParse({}).success).toBe(false);
    expect(updateTestCaseSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(updateTestCaseSchema.safeParse({ priority: "High", title: "Usable title" }).success).toBe(true);
  });
});
