export const APPLICATION_TYPES = ["Web", "Mobile", "API"] as const;
export const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export const DETAIL_LEVELS = ["Concise", "Standard", "Detailed"] as const;
export const TESTING_CATEGORIES = [
  "Functional Testing",
  "Positive Testing",
  "Negative Testing",
  "Boundary Value Testing",
  "Edge Case Testing",
  "Validation Testing",
  "Security Testing",
  "Usability Testing",
  "Regression Testing",
] as const;

export type ApplicationType = (typeof APPLICATION_TYPES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type DetailLevel = (typeof DETAIL_LEVELS)[number];
export type TestingCategory = (typeof TESTING_CATEGORIES)[number];

export interface TestStep {
  step: number;
  action: string;
  expectedResult: string;
}

export interface GeneratedTestCase {
  id: string;
  title: string;
  category: string;
  priority: Priority;
  preconditions: string[];
  testSteps: TestStep[];
  testData: string;
  expectedResult: string;
  tags: string[];
}

export interface EditableTestCase extends GeneratedTestCase {
  recordId?: string;
}

export interface GenerationConfiguration {
  featureName: string;
  applicationType: ApplicationType;
  priority: Priority;
  categories: TestingCategory[];
  testCaseCount: number;
  detailLevel: DetailLevel;
  environment?: string;
  browserDevice?: string;
  generationDurationMs?: number;
  model?: string;
}

export interface AiGenerationResult {
  requirementSummary: string;
  assumptions: string[];
  clarificationQuestions: string[];
  testCases: GeneratedTestCase[];
}

export interface GenerateFormValues {
  requirement: string;
  featureName: string;
  jiraTicketId: string;
  applicationType: ApplicationType;
  priority: Priority;
  categories: TestingCategory[];
  testCaseCount: number;
  detailLevel: DetailLevel;
  environment: string;
  browserDevice: string;
  pageUrl: string;
  loginEmail: string;
  loginPassword: string;
}

export interface TestSuiteRecord {
  id: string;
  title: string;
  requirement: string;
  jiraTicketId: string | null;
  configuration: GenerationConfiguration;
  requirementSummary: string | null;
  assumptions: string[];
  clarificationQuestions: string[];
  createdAt: string;
  updatedAt: string;
  testCases: EditableTestCase[];
  testCaseCount: number;
}

export interface SuiteStats {
  totalGenerations: number;
  totalTestCases: number;
  averageGenerationTimeMs: number | null;
  totalSavedTestSuites: number;
}

export interface RequirementExample {
  id: string;
  title: string;
  summary: string;
  requirement: string;
  featureName: string;
  jiraTicketId: string;
  applicationType: ApplicationType;
  priority: Priority;
  categories: TestingCategory[];
  sample: AiGenerationResult;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AppPreferences {
  testCaseCount: number;
  categories: TestingCategory[];
  detailLevel: DetailLevel;
}
