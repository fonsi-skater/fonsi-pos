import { z } from "zod";

export const createEmbedTokenSchema = z.object({
  branchId: z.string().uuid(),
  label: z.string().trim().max(60).optional().nullable(),
});

export type CreateEmbedTokenInput = z.infer<typeof createEmbedTokenSchema>;
