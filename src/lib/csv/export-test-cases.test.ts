import { describe, expect, it } from "vitest";
import { buildCsvFilename, buildTestCasesCsv, CSV_HEADERS } from "@/lib/csv/export-test-cases";
import type { EditableTestCase } from "@/types/domain";

const testCase: EditableTestCase = {
  id: "TC-001",
  title: '=HYPERLINK("http://example.test")',
  category: "Security Testing",
  priority: "High",
  preconditions: ["User is signed in", 'Name is "Ada"'],
  testSteps: [
    { step: 1, action: "Open the page", expectedResult: "The form is shown" },
    { step: 2, action: "+admin", expectedResult: "The request is rejected" },
  ],
  testData: "user@example.com",
  expectedResult: "No account change is saved",
  tags: ["Auth", "Security"],
};

describe("CSV generation", () => {
  it("escapes formulas, quotes, and writes one row per step", () => {
    const csv = buildTestCasesCsv([testCase]);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe(CSV_HEADERS.join(","));
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain(`"'=HYPERLINK(""http://example.test"")"`);
    expect(lines[1]).toContain('"User is signed in | Name is ""Ada"""');
    expect(lines[2]).toContain("'+admin");
    expect(lines[1]).toContain("TC-001");
    expect(lines[2]).toContain("No account change is saved");
  });

  it("builds a readable filename", () => {
    expect(buildCsvFilename("Password Reset!", new Date("2026-11-06T00:00:00.000Z"))).toBe(
      "password-reset-2026-11-06.csv",
    );
  });
});
