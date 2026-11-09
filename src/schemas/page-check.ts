import { z } from "zod";

export const pageCheckRequestSchema = z.object({
  siteUrl: z.string().trim().min(1).max(2_000),
  loginEmail: z.string().trim().max(200).optional(),
  loginPassword: z.string().max(200).optional(),
});
