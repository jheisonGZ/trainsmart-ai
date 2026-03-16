import { z } from 'zod';

export const ROUTINE_LLM_EXERCISE_SCHEMA = z.object({
  exercise_name: z.string().min(1),
  sets: z.number().int().min(1).max(10),
  reps: z.string().min(1).max(50),
  rest_seconds: z.number().int().min(0).max(600),
  rpe: z.number().min(1).max(10).nullable(),
  tempo: z.string().max(20).nullable(),
  notes: z.string().max(500).nullable(),
}).strict();

export const ROUTINE_LLM_DAY_SCHEMA = z.object({
  day_index: z.number().int().min(1).max(7),
  day_label: z.string().min(1).max(120),
  warmup_notes: z.string().min(1).max(1000),
  cooldown_notes: z.string().min(1).max(1000),
  exercises: z.array(ROUTINE_LLM_EXERCISE_SCHEMA).min(1),
}).strict();

export const ROUTINE_OUTPUT_SCHEMA = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(1000),
  safety_warnings: z.array(z.string().min(1).max(300)).default([]),
  weekly_plan: z.array(ROUTINE_LLM_DAY_SCHEMA).min(1).max(7),
}).strict().superRefine((value, ctx) => {
  const seen = new Set<number>();

  for (const day of value.weekly_plan) {
    if (seen.has(day.day_index)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weekly_plan'],
        message: 'Each day_index must be unique.',
      });
      return;
    }

    seen.add(day.day_index);
  }
});

export const ROUTINE_OUTPUT_JSON_SHAPE = `{
  "title": "string",
  "summary": "string",
  "safety_warnings": ["string"],
  "weekly_plan": [
    {
      "day_index": 1,
      "day_label": "string",
      "warmup_notes": "string",
      "cooldown_notes": "string",
      "exercises": [
        {
          "exercise_name": "string",
          "sets": 3,
          "reps": "8-12",
          "rest_seconds": 60,
          "rpe": 6,
          "tempo": "2-1-2-0",
          "notes": "string"
        }
      ]
    }
  ]
}`;

export type RoutineOutputSchema = z.infer<typeof ROUTINE_OUTPUT_SCHEMA>;
