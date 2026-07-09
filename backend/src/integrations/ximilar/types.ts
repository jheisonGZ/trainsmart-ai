import { z } from 'zod';

export const ximilarStatusSchema = z.object({
  code: z.number(),
  text: z.string(),
}).passthrough();

export const ximilarTagSchema = z.object({
  name: z.string().optional(),
  prob: z.number().optional(),
}).passthrough();

export const ximilarPhotoTaggingResponseSchema = z.object({
  status: ximilarStatusSchema,
  records: z
    .array(
      z.object({
        _tags: z.array(ximilarTagSchema).optional().default([]),
        _width: z.number().optional(),
        _height: z.number().optional(),
        _status: ximilarStatusSchema.optional(),
      }).passthrough(),
    )
    .min(1),
  statistics: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export type XimilarPhotoTaggingResponse = z.infer<
  typeof ximilarPhotoTaggingResponseSchema
>;

export const ximilarDetectedObjectSchema = z.object({
  name: z.string().optional(),
  prob: z.number().optional(),
  bound_box: z.union([
    z.array(z.number()),
    z.record(z.string(), z.number()),
  ]).optional(),
}).passthrough();

export const ximilarPersonDetectionResponseSchema = z.object({
  status: ximilarStatusSchema,
  records: z
    .array(
      z.object({
        _objects: z
          .array(ximilarDetectedObjectSchema)
          .optional()
          .default([]),
        _status: ximilarStatusSchema.optional(),
      }).passthrough(),
    )
    .min(1),
}).passthrough();

export type XimilarPersonDetectionResponse = z.infer<
  typeof ximilarPersonDetectionResponseSchema
>;