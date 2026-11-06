import { describe, expect, it } from "vitest";
import { generateFormSchema } from "@/schemas/generate-form";
import type { GenerateFormValues } from "@/types/domain";

const valid: GenerateFormValues = {
  requirement: "Users can reset a forgotten password from the login page by email.",
  featureName: "Password reset",
  jiraTicketId: "AUTH-124",
  applicationType: "Web",
  priority: "High",
  categories: ["Positive Testing", "Negative Testing"],
  testCaseCount: 6,
  detailLevel: "Standard",
  environment: "Staging",
  browserDevice: "Chrome",
  pageUrl: "",
  loginEmail: "",
  loginPassword: "",
};

describe("requirement form validation", () => {
  it("accepts a complete generation request", async () => {
    await expect(generateFormSchema.validate(valid)).resolves.toMatchObject({
      featureName: "Password reset",
      testCaseCount: 6,
    });
  });

  it("requires a substantive requirement and at least one category", async () => {
    await expect(
      generateFormSchema.validate({ ...valid, requirement: "too short" }),
    ).rejects.toThrow(/at least 20 characters/i);

    await expect(generateFormSchema.validate({ ...valid, categories: [] })).rejects.toThrow(
      /at least one testing category/i,
    );

    await expect(generateFormSchema.validate({ ...valid, featureName: "  " })).rejects.toThrow(
      /feature or module name is required/i,
    );
  });

  it("accepts a page URL without a written requirement", async () => {
    await expect(
      generateFormSchema.validate({
        ...valid,
        requirement: "",
        pageUrl: "https://stg.example.com/create-campaign",
        loginEmail: "qa@example.com",
      }),
    ).resolves.toMatchObject({ pageUrl: "https://stg.example.com/create-campaign" });
  });

  it("limits the number of requested test cases", async () => {
    await expect(generateFormSchema.validate({ ...valid, testCaseCount: 40 })).rejects.toThrow(
      /at most 20/i,
    );
  });
});
