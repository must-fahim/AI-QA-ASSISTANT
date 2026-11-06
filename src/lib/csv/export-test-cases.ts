import type { EditableTestCase } from "@/types/domain";
import { slugify } from "@/lib/format";

export const CSV_HEADERS = [
  "Test Case ID",
  "Title",
  "Category",
  "Priority",
  "Preconditions",
  "Step Number",
  "Test Action",
  "Step Expected Result",
  "Test Data",
  "Overall Expected Result",
  "Tags",
] as const;

export function sanitizeCsvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  const dangerous = /^[\t\r\n ]*[=+\-@]/.test(text);
  const safe = dangerous ? `'${text}` : text;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildTestCasesCsv(cases: EditableTestCase[]) {
  const lines = [CSV_HEADERS.map(sanitizeCsvCell).join(",")];

  for (const testCase of cases) {
    const steps = testCase.testSteps.length
      ? testCase.testSteps
      : [{ step: "", action: "", expectedResult: "" }];
    const preconditions = testCase.preconditions.join(" | ");
    const tags = testCase.tags.join(" | ");

    for (const step of steps) {
      lines.push(
        [
          testCase.id,
          testCase.title,
          testCase.category,
          testCase.priority,
          preconditions,
          step.step,
          step.action,
          step.expectedResult,
          testCase.testData,
          testCase.expectedResult,
          tags,
        ]
          .map(sanitizeCsvCell)
          .join(","),
      );
    }
  }

  return lines.join("\r\n");
}

export function buildCsvFilename(title: string, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  return `${slugify(title)}-${stamp}.csv`;
}
