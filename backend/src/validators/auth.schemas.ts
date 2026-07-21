import { z } from 'zod';

export const loginGreetingQuerySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  hour: z.coerce.number().int().min(0).max(23).optional(),
});

export type LoginGreetingQueryInput = z.infer<typeof loginGreetingQuerySchema>;

export const logoutFarewellQuerySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
});

export type LogoutFarewellQueryInput = z.infer<typeof logoutFarewellQuerySchema>;
