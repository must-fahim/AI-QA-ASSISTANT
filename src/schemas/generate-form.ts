import * as yup from "yup";
import { LIMITS } from "@/constants/limits";
import {
  APPLICATION_TYPES,
  DETAIL_LEVELS,
  PRIORITIES,
  TESTING_CATEGORIES,
  type GenerateFormValues,
} from "@/types/domain";

export const generateFormSchema: yup.ObjectSchema<GenerateFormValues> = yup.object({
  requirement: yup
    .string()
    .trim()
    .defined()
    .default("")
    .max(LIMITS.requirementMax, `Requirement must be ${LIMITS.requirementMax} characters or fewer.`)
    .when("pageUrl", {
      is: (pageUrl: string) => !pageUrl?.trim(),
      then: (schema) =>
        schema
          .required("Requirement is required.")
          .min(LIMITS.requirementMin, `Requirement must be at least ${LIMITS.requirementMin} characters.`),
    }),
  featureName: yup
    .string()
    .trim()
    .required("Feature or module name is required.")
    .max(LIMITS.featureNameMax, `Use ${LIMITS.featureNameMax} characters or fewer.`),
  jiraTicketId: yup
    .string()
    .trim()
    .max(LIMITS.jiraMax, `Use ${LIMITS.jiraMax} characters or fewer.`)
    .defined()
    .default(""),
  applicationType: yup
    .string()
    .oneOf(APPLICATION_TYPES, "Select an application type.")
    .required("Select an application type."),
  priority: yup.string().oneOf(PRIORITIES, "Select a priority.").required("Select a priority."),
  categories: yup
    .array()
    .of(yup.string().oneOf(TESTING_CATEGORIES).required())
    .min(1, "Select at least one testing category.")
    .required("Select at least one testing category."),
  testCaseCount: yup
    .number()
    .typeError("Enter the number of test cases.")
    .integer("Enter a whole number.")
    .min(LIMITS.testCaseCountMin, `Generate at least ${LIMITS.testCaseCountMin} test case.`)
    .max(LIMITS.testCaseCountMax, `Generate at most ${LIMITS.testCaseCountMax} test cases.`)
    .required("Enter the number of test cases."),
  detailLevel: yup
    .string()
    .oneOf(DETAIL_LEVELS, "Select a detail level.")
    .required("Select a detail level."),
  environment: yup.string().trim().max(LIMITS.featureNameMax).defined().default(""),
  browserDevice: yup.string().trim().max(LIMITS.featureNameMax).defined().default(""),
  pageUrl: yup
    .string()
    .trim()
    .defined()
    .default("")
    .max(2_000, "Use 2000 characters or fewer.")
    .test("page-url", "Enter an http or https URL.", (value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }),
  loginEmail: yup.string().trim().defined().default("").max(200, "Use 200 characters or fewer."),
  loginPassword: yup.string().defined().default("").max(200, "Use 200 characters or fewer."),
});
