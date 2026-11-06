import type { EditableTestCase, GeneratedTestCase } from "@/types/domain";

export interface TestCasePatch {
  title?: string;
  category?: string;
  priority?: EditableTestCase["priority"];
  preconditions?: string[];
  testSteps?: EditableTestCase["testSteps"];
  testData?: string;
  expectedResult?: string;
  tags?: string[];
}

export function applyTestCasePatch<T extends GeneratedTestCase>(testCase: T, patch: TestCasePatch): T {
  const next: T = { ...testCase, ...patch };

  if (patch.preconditions) {
    next.preconditions = patch.preconditions.map((item) => item.trim()).filter(Boolean);
  }

  if (patch.testSteps) {
    next.testSteps = patch.testSteps.map((step, index) => ({
      step: index + 1,
      action: step.action.trim(),
      expectedResult: step.expectedResult.trim(),
    }));
  }

  if (patch.tags) {
    next.tags = [...new Set(patch.tags.map((tag) => tag.trim()).filter(Boolean))];
  }

  if (patch.title) next.title = patch.title.trim();
  if (patch.category) next.category = patch.category.trim();
  if (patch.expectedResult) next.expectedResult = patch.expectedResult.trim();

  return next;
}
