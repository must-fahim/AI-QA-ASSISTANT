import type {
  EditableTestCase,
  GenerationConfiguration,
  TestSuiteRecord,
} from "@/types/domain";

export interface SuiteRow {
  id: string;
  title: string;
  requirement: string;
  jira_ticket_id: string | null;
  configuration: GenerationConfiguration;
  requirement_summary: string | null;
  assumptions: string[];
  clarification_questions: string[];
  created_at: string;
  updated_at: string;
}

export interface CaseRow {
  id: string;
  suite_id: string;
  test_case_id: string;
  title: string;
  category: string;
  priority: EditableTestCase["priority"];
  preconditions: string[];
  test_steps: EditableTestCase["testSteps"];
  test_data: string | null;
  expected_result: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export function mapCaseRow(row: CaseRow): EditableTestCase {
  return {
    recordId: row.id,
    id: row.test_case_id,
    title: row.title,
    category: row.category,
    priority: row.priority,
    preconditions: asStringArray(row.preconditions),
    testSteps: Array.isArray(row.test_steps) ? row.test_steps : [],
    testData: row.test_data ?? "",
    expectedResult: row.expected_result ?? "",
    tags: asStringArray(row.tags),
  };
}

export function mapSuiteRow(row: SuiteRow, testCases: EditableTestCase[] = []): TestSuiteRecord {
  return {
    id: row.id,
    title: row.title,
    requirement: row.requirement,
    jiraTicketId: row.jira_ticket_id,
    configuration: row.configuration ?? {
      featureName: row.title,
      applicationType: "Web",
      priority: "Medium",
      categories: ["Functional Testing"],
      testCaseCount: testCases.length || 1,
      detailLevel: "Standard",
    },
    requirementSummary: row.requirement_summary,
    assumptions: asStringArray(row.assumptions),
    clarificationQuestions: asStringArray(row.clarification_questions),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    testCases,
    testCaseCount: testCases.length,
  };
}

export function toCaseInsert(suiteId: string, testCase: EditableTestCase) {
  return {
    suite_id: suiteId,
    test_case_id: testCase.id,
    title: testCase.title,
    category: testCase.category,
    priority: testCase.priority,
    preconditions: testCase.preconditions,
    test_steps: testCase.testSteps,
    test_data: testCase.testData,
    expected_result: testCase.expectedResult,
    tags: testCase.tags,
  };
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
