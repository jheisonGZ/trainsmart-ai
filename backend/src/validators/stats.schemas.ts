import { z } from 'zod';

export const statsQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(52).default(8),
});

export type StatsQueryInput = z.infer<typeof statsQuerySchema>;
