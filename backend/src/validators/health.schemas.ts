import { z } from 'zod';

const healthArraySchema = z.array(z.string().trim().min(1).max(120)).max(50);

export const healthHistorySchema = z.object({
  injuries: healthArraySchema.default([]),
  joint_problems: healthArraySchema.default([]),
  conditions: healthArraySchema.default([]),
  limitations: healthArraySchema.default([]),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const bodyMetricSchema = z
  .object({
    measured_at: z.string().datetime().optional(),
    weight_kg: z.coerce.number().min(20).max(500).optional(),
    height_cm: z.coerce.number().min(50).max(300).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(
    (value) =>
      value.weight_kg !== undefined ||
      value.height_cm !== undefined ||
      (typeof value.notes === 'string' && value.notes.length > 0),
    {
      message: 'At least one body metric field must be provided.',
    },
  );

export const metricQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type HealthHistoryInput = z.infer<typeof healthHistorySchema>;
export type BodyMetricInput = z.infer<typeof bodyMetricSchema>;
export type MetricQueryInput = z.infer<typeof metricQuerySchema>;
