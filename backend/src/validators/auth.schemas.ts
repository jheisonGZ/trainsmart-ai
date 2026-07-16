import { z } from 'zod';

export const loginGreetingQuerySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
});

export type LoginGreetingQueryInput = z.infer<typeof loginGreetingQuerySchema>;
