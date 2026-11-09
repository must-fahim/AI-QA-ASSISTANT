import { z } from "zod";

export const savedPageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().min(1).max(2_000),
  source: z.enum(["discovered", "manual"]),
  lastStatus: z.enum(["loaded", "failed"]).nullable().optional(),
});

export const saveTestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  siteUrl: z.string().trim().min(1).max(2_000),
  pages: z.array(savedPageSchema).min(1).max(200),
});

export const updateSavedTestSchema = saveTestSchema;

export const retestRequestSchema = z.object({
  loginEmail: z.string().trim().max(200).optional(),
  loginPassword: z.string().max(200).optional(),
});
