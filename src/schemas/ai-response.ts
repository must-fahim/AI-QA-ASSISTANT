import { z } from "zod";
import { LIMITS } from "@/constants/limits";
import { PRIORITIES, type Priority } from "@/types/domain";

const PRIORITY_ALIASES: Record<string, Priority> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const testStepSchema = z.object({
  step: z.number().int().positive(),
  action: z.string().trim().min(1).max(LIMITS.stepTextMax),
  expectedResult: z.string().trim().min(1).max(LIMITS.stepTextMax),
});

export const generatedTestCaseSchema = z.object({
  id: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(LIMITS.caseTitleMax),
  category: z.string().trim().min(1).max(LIMITS.categoryMax),
  priority: z.enum(PRIORITIES),
  preconditions: z.array(z.string().trim().min(1).max(500)).max(LIMITS.maxPreconditions),
  testSteps: z.array(testStepSchema).min(1).max(LIMITS.maxSteps),
  testData: z.string().max(LIMITS.textMax),
  expectedResult: z.string().trim().min(1).max(LIMITS.textMax),
  tags: z.array(z.string().trim().min(1).max(LIMITS.tagMax)).max(LIMITS.maxTags),
});

export const aiGenerationResultSchema = z.object({
  requirementSummary: z.string().trim().min(1).max(5_000),
  assumptions: z.array(z.string().trim().min(1).max(1_000)).max(LIMITS.maxAssumptions),
  clarificationQuestions: z
    .array(z.string().trim().min(1).max(1_000))
    .max(LIMITS.maxAssumptions),
  testCases: z.array(generatedTestCaseSchema).min(1).max(LIMITS.testCaseCountMax),
});

export function normalizeAiPayload(input: unknown) {
  const root = asRecord(input) ?? {};
  const rawCases = collectCases(root);

  const seen = new Set<string>();
  const testCases = [];

  for (const item of rawCases) {
    const record = asRecord(item);
    if (!record) continue;
    const title = clip(
      asString(
        record.title ?? record.name ?? record.scenario ?? record.testName ?? record.test_name,
      ),
      LIMITS.caseTitleMax,
    );
    const testSteps = normalizeSteps(record.testSteps ?? record.test_steps ?? record.steps);
    const signature = `${title.toLowerCase()}::${JSON.stringify(testSteps)}`;
    if (!title || !testSteps.length || seen.has(signature)) continue;
    seen.add(signature);
    const expectedResult =
      clip(
        asString(
          record.expectedResult ??
            record.expected_result ??
            record.expected ??
            record.expectedOutcome ??
            record.overallExpectedResult,
        ),
        LIMITS.textMax,
      ) || clip(testSteps[testSteps.length - 1]?.expectedResult ?? "", LIMITS.textMax);
    testCases.push({
      id: `TC-${String(testCases.length + 1).padStart(3, "0")}`,
      title,
      category: clip(asString(record.category) || "Functional Testing", LIMITS.categoryMax),
      priority: normalizePriority(record.priority ?? record.severity),
      preconditions: clipList(asStringList(record.preconditions ?? record.precondition), 500, LIMITS.maxPreconditions),
      testSteps,
      testData: clip(asString(record.testData ?? record.test_data ?? record.data), LIMITS.textMax),
      expectedResult,
      tags: clipList(asStringList(record.tags), LIMITS.tagMax, LIMITS.maxTags),
    });
    if (testCases.length >= LIMITS.testCaseCountMax) break;
  }

  return {
    requirementSummary: clip(
      asString(root.requirementSummary ?? root.requirement_summary ?? root.summary) ||
        "Test cases for the requested categories.",
      5_000,
    ),
    assumptions: asStringList(root.assumptions),
    clarificationQuestions: asStringList(
      root.clarificationQuestions ?? root.clarification_questions,
    ),
    testCases,
  };
}

export function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("AI response did not contain a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

function collectCases(root: Record<string, unknown>) {
  const keys = [
    "testCases",
    "test_cases",
    "cases",
    "securityTestCases",
    "security_test_cases",
    "regressionTestCases",
    "regression_test_cases",
    "usabilityTestCases",
    "usability_test_cases",
  ];
  for (const key of keys) {
    const cases = readCaseList(root[key]);
    if (cases.length) return cases;
  }
  return [];
}

function readCaseList(value: unknown) {
  if (Array.isArray(value)) return value;
  const grouped = asRecord(value);
  if (!grouped) return [];
  return Object.entries(grouped).flatMap(([category, items]) => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const record = asRecord(item);
      if (!record || asString(record.category)) return item;
      return { ...record, category };
    });
  });
}

function normalizeSteps(value: unknown) {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\n+/).map((line) => line.replace(/^\d+[\).\s]+/, "").trim()).filter(Boolean)
      : [];
  return items.flatMap((item, index) => {
    const record = asRecord(item);
    const action = clip(
      record
        ? asString(record.action ?? record.stepAction ?? record.description ?? record.step)
        : asString(item),
      LIMITS.stepTextMax,
    );
    if (!action || /^\d+$/.test(action)) return [];
    const rawStep = record?.step ?? record?.stepNumber ?? record?.number ?? index + 1;
    const parsed = typeof rawStep === "number" ? rawStep : Number(rawStep);
    return [
      {
        step: Number.isInteger(parsed) && parsed > 0 ? parsed : index + 1,
        action,
        expectedResult: clip(
          (record
            ? asString(record.expectedResult ?? record.expected_result ?? record.expected)
            : "") || "The action completes without an error.",
          LIMITS.stepTextMax,
        ),
      },
    ];
  });
}

function clip(value: string, max: number) {
  return value.length > max ? value.slice(0, max).trim() : value;
}

function clipList(values: string[], itemMax: number, listMax: number) {
  return values.map((item) => clip(item, itemMax)).filter(Boolean).slice(0, listMax);
}

function normalizePriority(value: unknown): Priority {
  return PRIORITY_ALIASES[asString(value).toLowerCase()] ?? "Medium";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(asString).filter(Boolean);
  }
  const text = asString(value);
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}
