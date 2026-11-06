import { z } from "zod";
import { LIMITS } from "@/constants/limits";
import {
  APPLICATION_TYPES,
  DETAIL_LEVELS,
  PRIORITIES,
  TESTING_CATEGORIES,
} from "@/types/domain";
import { generatedTestCaseSchema } from "@/schemas/ai-response";

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const configurationSchema = z.object({
  featureName: z.string().trim().min(1).max(LIMITS.featureNameMax),
  applicationType: z.enum(APPLICATION_TYPES),
  priority: z.enum(PRIORITIES),
  categories: z.array(z.enum(TESTING_CATEGORIES)).min(1),
  testCaseCount: z.number().int().min(LIMITS.testCaseCountMin).max(LIMITS.testCaseCountMax),
  detailLevel: z.enum(DETAIL_LEVELS),
  environment: optionalText(LIMITS.featureNameMax),
  browserDevice: optionalText(LIMITS.featureNameMax),
  generationDurationMs: z.number().int().nonnegative().max(600_000).optional(),
  model: optionalText(120),
});

export const generateRequestSchema = z
  .object({
    requirement: z.string().trim().max(LIMITS.requirementMax),
    featureName: z.string().trim().min(1).max(LIMITS.featureNameMax),
    jiraTicketId: optionalText(LIMITS.jiraMax),
    applicationType: z.enum(APPLICATION_TYPES),
    priority: z.enum(PRIORITIES),
    categories: z.array(z.enum(TESTING_CATEGORIES)).min(1),
    testCaseCount: z.number().int().min(LIMITS.testCaseCountMin).max(LIMITS.testCaseCountMax),
    detailLevel: z.enum(DETAIL_LEVELS),
    environment: optionalText(LIMITS.featureNameMax),
    browserDevice: optionalText(LIMITS.featureNameMax),
    pageUrl: z.string().trim().max(2_000).optional(),
    loginEmail: z.string().trim().max(200).optional(),
    loginPassword: z.string().max(200).optional(),
  })
  .superRefine((value, context) => {
    const hasPage = Boolean(value.pageUrl);
    if (!hasPage && value.requirement.length < LIMITS.requirementMin) {
      context.addIssue({
        code: "custom",
        path: ["requirement"],
        message: `Requirement must be at least ${LIMITS.requirementMin} characters, or provide a page URL.`,
      });
    }
    if ((value.loginEmail || value.loginPassword) && !hasPage) {
      context.addIssue({
        code: "custom",
        path: ["pageUrl"],
        message: "Enter the page URL before adding login details.",
      });
    }
  });

export const createSuiteSchema = z.object({
  title: z.string().trim().min(1).max(LIMITS.titleMax),
  requirement: z.string().trim().min(1).max(LIMITS.requirementMax),
  jiraTicketId: optionalText(LIMITS.jiraMax),
  configuration: configurationSchema,
  requirementSummary: z.string().trim().min(1).max(5_000),
  assumptions: z.array(z.string().trim().min(1).max(1_000)).max(LIMITS.maxAssumptions).default([]),
  clarificationQuestions: z
    .array(z.string().trim().min(1).max(1_000))
    .max(LIMITS.maxAssumptions)
    .default([]),
  testCases: z.array(generatedTestCaseSchema).min(1).max(LIMITS.testCaseCountMax),
});

export const updateSuiteSchema = z
  .object({
    title: z.string().trim().min(1).max(LIMITS.titleMax).optional(),
    requirement: z.string().trim().min(LIMITS.requirementMin).max(LIMITS.requirementMax).optional(),
    jiraTicketId: z.string().trim().max(LIMITS.jiraMax).nullable().optional(),
    requirementSummary: z.string().trim().max(5_000).nullable().optional(),
    assumptions: z.array(z.string().trim().min(1).max(1_000)).max(LIMITS.maxAssumptions).optional(),
    clarificationQuestions: z
      .array(z.string().trim().min(1).max(1_000))
      .max(LIMITS.maxAssumptions)
      .optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required.",
  });

export const updateTestCaseSchema = z
  .object({
    title: z.string().trim().min(1).max(LIMITS.caseTitleMax).optional(),
    category: z.string().trim().min(1).max(LIMITS.categoryMax).optional(),
    priority: z.enum(PRIORITIES).optional(),
    preconditions: z.array(z.string().trim().min(1).max(500)).max(LIMITS.maxPreconditions).optional(),
    testSteps: z.array(testStepUpdateSchema()).min(1).max(LIMITS.maxSteps).optional(),
    testData: z.string().max(LIMITS.textMax).optional(),
    expectedResult: z.string().trim().min(1).max(LIMITS.textMax).optional(),
    tags: z.array(z.string().trim().min(1).max(LIMITS.tagMax)).max(LIMITS.maxTags).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required.",
  });

function testStepUpdateSchema() {
  return z.object({
    step: z.number().int().positive(),
    action: z.string().trim().min(1).max(LIMITS.stepTextMax),
    expectedResult: z.string().trim().min(1).max(LIMITS.stepTextMax),
  });
}

export const recordIdSchema = z.uuid();
