import { z } from 'zod';

export const perceivedEffortSchema = z.enum(['easy', 'moderate', 'hard']);

export const sessionListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createSessionSchema = z.object({
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  routine_version_id: z.string().uuid().nullable().optional(),
  routine_day_id: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const sessionExerciseSchema = z.object({
  exercise_id: z.string().uuid().nullable().optional(),
  exercise_name: z.string().trim().min(1).max(200),
  exercise_order: z.coerce.number().int().min(1),
  planned_sets: z.coerce.number().int().min(1).max(20).nullable().optional(),
  planned_reps: z.string().trim().max(50).nullable().optional(),
  performed_sets: z.coerce.number().int().min(0).max(20).nullable().optional(),
  performed_reps: z.string().trim().max(50).nullable().optional(),
  weight_kg: z.coerce.number().min(0).max(1000).nullable().optional(),
  rest_seconds: z.coerce.number().int().min(0).max(600).nullable().optional(),
});

export const finishSessionSchema = z.object({
  perceived_effort: perceivedEffortSchema.optional(),
  difficulty_rating: z.coerce.number().int().min(1).max(10).optional(),
  pain_or_discomfort: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid(),
});

export type SessionListQueryInput = z.infer<typeof sessionListQuerySchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SessionExerciseInput = z.infer<typeof sessionExerciseSchema>;
export type FinishSessionInput = z.infer<typeof finishSessionSchema>;
