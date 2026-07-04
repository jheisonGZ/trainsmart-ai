import { z } from 'zod';

export const ximilarTagSchema = z.object({
  name: z.string(),
  prob: z.number(),
});

export const ximilarPhotoTaggingResponseSchema = z.object({
  status: z.object({
    code: z.number(),
    text: z.string(),
  }),
  records: z
    .array(
      z.object({
        _tags: z.array(ximilarTagSchema).optional().default([]),
        _width: z.number().optional(),
        _height: z.number().optional(),
        _status: z
          .object({
            code: z.number(),
            text: z.string(),
          })
          .optional(),
      }),
    )
    .min(1),
  statistics: z.record(z.string(), z.unknown()).optional(),
});

export type XimilarPhotoTaggingResponse = z.infer<
  typeof ximilarPhotoTaggingResponseSchema
>;

export const ximilarPersonDetectionResponseSchema = z.object({
  status: z.object({
    code: z.number(),
    text: z.string(),
  }),
  records: z
    .array(
      z.object({
        _objects: z
          .array(
            z.object({
              name: z.string(),
              prob: z.number(),
              bound_box: z
                .array(z.number())
                .length(4)
                .optional(),
            }),
          )
          .optional()
          .default([]),
        _status: z
          .object({
            code: z.number(),
            text: z.string(),
          })
          .optional(),
      }),
    )
    .min(1),
});

export type XimilarPersonDetectionResponse = z.infer<
  typeof ximilarPersonDetectionResponseSchema
>;
