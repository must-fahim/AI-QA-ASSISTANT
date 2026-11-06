export const LIMITS = {
  requirementMin: 20,
  requirementMax: 20_000,
  featureNameMax: 120,
  jiraMax: 50,
  titleMax: 200,
  caseTitleMax: 300,
  categoryMax: 80,
  textMax: 2_000,
  stepTextMax: 1_000,
  tagMax: 40,
  testCaseCountMin: 1,
  testCaseCountMax: 20,
  maxPreconditions: 30,
  maxSteps: 40,
  maxTags: 20,
  maxAssumptions: 30,
} as const;

export const DEFAULT_PREFERENCES = {
  testCaseCount: 8,
  categories: [
    "Functional Testing",
    "Positive Testing",
    "Negative Testing",
    "Boundary Value Testing",
    "Edge Case Testing",
    "Validation Testing",
  ],
  detailLevel: "Standard",
} as const;

export const PREFERENCES_STORAGE_KEY = "ai-qa-assistant.preferences";

export const PRIORITY_WEIGHT: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};
