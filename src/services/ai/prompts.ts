import type { z } from "zod";
import type { generateRequestSchema } from "@/schemas/records";

export const AI_SYSTEM_PROMPT = `You are an expert Senior QA Engineer.

Analyze software requirements and generate comprehensive, executable software test cases.

Identify functional behavior, business rules, positive scenarios, negative scenarios, boundary conditions, edge cases, validation rules, and relevant security considerations.

Do not invent undocumented business rules.

Identify assumptions and clarification questions when requirements are incomplete.

Avoid duplicate test scenarios.

Every test case must contain a clear title, category, priority, preconditions, numbered test steps, expected results, test data, and overall expected result.

Return structured JSON only.`;

type GenerateRequest = z.infer<typeof generateRequestSchema>;

export function buildUserPrompt(input: GenerateRequest) {
  return `Generate software test cases for the requirement below.

Feature/module: ${input.featureName}
Jira ticket: ${input.jiraTicketId?.trim() || "Not provided"}
Application type: ${input.applicationType}
Priority focus: ${input.priority}
Testing categories to cover: ${input.categories.join(", ")}
Number of test cases: ${input.testCaseCount}
Detail level: ${input.detailLevel}
Testing environment: ${input.environment?.trim() || "Not provided"}
Browser/device: ${input.browserDevice?.trim() || "Not provided"}

Rules:
- Use only the requested testing categories.
- Security Testing, Usability Testing, and Regression Testing use this same JSON object. Do not return findings, checklists, risk ratings, or a different shape for those categories.
- Each test case category must be exactly one of: ${input.categories.join(", ")}.
- Produce exactly ${input.testCaseCount} unique test cases when the requirement supports that many. Produce fewer only when additional cases would duplicate a scenario or invent behavior.
- Detail level "${input.detailLevel}" controls how specific the steps and test data are.
- Priority values must be one of: Low, Medium, High, Critical.
- Every test case needs title, priority, preconditions, testSteps, testData, and expectedResult. Each test step is an object with action and expectedResult.
- Do not invent business rules that are not stated or directly implied.
- When the requirement includes an observed page, use only the listed controls and visible text.
- A counter such as 0/25 belongs only to the field named immediately before it. A "Max N characters" note belongs only to the field whose own placeholder contains that note. Do not copy one field's limit onto another field.
- Put gaps in assumptions or clarificationQuestions.
- Return JSON only, with no markdown.

JSON shape:
{
  "requirementSummary": "Summary of requirement",
  "assumptions": [],
  "clarificationQuestions": [],
  "testCases": [
    {
      "id": "TC-001",
      "title": "Verify successful password reset",
      "category": "Positive Testing",
      "priority": "High",
      "preconditions": ["User has a registered account"],
      "testSteps": [
        {
          "step": 1,
          "action": "Navigate to the login page",
          "expectedResult": "Login page is displayed"
        }
      ],
      "testData": "Valid registered email address",
      "expectedResult": "Password reset email is sent successfully",
      "tags": ["Authentication", "Password Reset"]
    }
  ]
}

Requirement:
${input.requirement}`;
}
