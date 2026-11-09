import * as yup from "yup";

export interface PageCheckFormValues {
  siteUrl: string;
  loginEmail: string;
  loginPassword: string;
}

export const pageCheckFormSchema: yup.ObjectSchema<PageCheckFormValues> = yup.object({
  siteUrl: yup
    .string()
    .trim()
    .required("Site URL is required.")
    .max(2_000, "Use 2000 characters or fewer.")
    .test("site-url", "Enter an http or https URL.", (value) => {
      if (!value) return false;
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
