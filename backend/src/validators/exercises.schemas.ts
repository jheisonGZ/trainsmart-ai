import { z } from 'zod';

export const muscleSchema = z.enum([
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'full_body',
  'cardio',
  'mobility',
  'other',
]);

export const equipmentSchema = z.enum([
  'none',
  'dumbbells',
  'barbell',
  'machine',
  'cables',
  'bands',
  'kettlebell',
  'other',
]);

export const difficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const exerciseQuerySchema = z.object({
  muscle: muscleSchema.optional(),
  equipment: equipmentSchema.optional(),
  difficulty: difficultySchema.optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const exerciseIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ExerciseQueryInput = z.infer<typeof exerciseQuerySchema>;
