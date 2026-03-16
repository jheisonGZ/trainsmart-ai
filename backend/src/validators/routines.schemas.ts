import { z } from 'zod';

export const routineGenerateSchema = z.object({
  customInstructions: z.string().trim().max(1000).optional(),
});

export const routineRegenerateSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  customInstructions: z.string().trim().max(1000).optional(),
});

export const routineIdParamSchema = z.object({
  routineId: z.string().uuid(),
});

export const versionIdParamSchema = z.object({
  versionId: z.string().uuid(),
});

export const todayQuerySchema = z.object({
  day_index: z.coerce.number().int().min(1).max(7).optional(),
});

export type RoutineGenerateInput = z.infer<typeof routineGenerateSchema>;
export type RoutineRegenerateInput = z.infer<typeof routineRegenerateSchema>;
export type TodayQueryInput = z.infer<typeof todayQuerySchema>;
