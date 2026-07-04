import { z } from 'zod';

const imageDataUrlSchema = z
  .string()
  .trim()
  .regex(
    /^data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\r\n]+$/,
    'A valid PNG, JPEG, JPG, or WEBP image data URL is required.',
  );

export const analyzeEnvironmentSchema = z.object({
  image_data_url: imageDataUrlSchema,
  file_name: z.string().trim().min(1).max(200).optional(),
});

export type AnalyzeEnvironmentInput = z.infer<typeof analyzeEnvironmentSchema>;
