import { z } from "zod";

const resumePageSchema = z.object({
  url: z.string().trim().min(1).max(2_000),
  name: z.string().trim().min(1).max(120),
});

const resumeSchema = z.object({
  seen: z.array(z.string().trim().min(1).max(2_000)).max(80).optional(),
  queue: z.array(resumePageSchema).max(80).optional(),
  similar: z.array(z.object({
    shape: z.string().trim().min(1).max(300),
    count: z.number().int().min(0).max(10),
  })).max(80).optional(),
  menuDiscovered: z.boolean().optional(),
  checked: z.number().int().min(0).max(80),
  failed: z.number().int().min(0).max(80),
});

export const pageCheckRequestSchema = z.object({
  siteUrl: z.string().trim().min(1).max(2_000),
  loginEmail: z.string().trim().max(200).optional(),
  loginPassword: z.string().max(200).optional(),
  resume: resumeSchema.optional(),
});
