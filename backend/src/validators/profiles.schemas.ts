import { z } from 'zod';

export const sexSchema = z.enum(['male', 'female', 'other', 'prefer_not_say']);
export const experienceLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const goalSchema = z.enum([
  'lose_fat',
  'gain_muscle',
  'strength',
  'general_fitness',
  'mobility',
]);

const optionalTrimmedString = z.string().trim().min(1).max(200).optional();

export const createProfileSchema = z.object({
  name: optionalTrimmedString,
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sex: sexSchema.optional(),
  height_cm: z.coerce.number().min(50).max(300).optional(),
  weight_kg: z.coerce.number().min(20).max(500).optional(),
  experience_level: experienceLevelSchema.optional(),
  goal: goalSchema.optional(),
  days_per_week: z.coerce.number().int().min(1).max(7).optional(),
  time_per_session: z.coerce.number().int().min(15).max(180).optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().optional(),
});

export const updateProfileSchema = createProfileSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field must be provided.',
  });

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
