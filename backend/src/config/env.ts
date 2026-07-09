import { config } from 'dotenv';
import { z } from 'zod';

config();

const booleanEnvSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  if (value.toLowerCase() === 'true') {
    return true;
  }

  if (value.toLowerCase() === 'false') {
    return false;
  }

  return value;
}, z.boolean());

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_TIME_ZONE: z
    .string()
    .min(1)
    .default('America/Bogota')
    .refine(isValidTimeZone, 'APP_TIME_ZONE must be a valid IANA time zone.'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().optional().default(''),
  DIRECT_URL: z.string().optional().default(''),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  GROQ_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().min(1).default('llama-3.3-70b-versatile'),
  LLM_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  XIMILAR_API_TOKEN: z.string().default(''),
  XIMILAR_BASE_URL: z.string().url().default('https://api.ximilar.com'),
  ELEVENLABS_API_KEY: z.string().default(''),
  ELEVENLABS_VOICE_ID: z.string().default('JBFqnCBsd6RMkjVDRZzb'),
  ELEVENLABS_MODEL_ID: z.string().min(1).default('eleven_multilingual_v2'),
  ELEVENLABS_OUTPUT_FORMAT: z.string().min(1).default('mp3_44100_128'),
  ELEVENLABS_ENABLED: booleanEnvSchema.default(false),
  SUPABASE_ROUTINE_AUDIO_BUCKET: z.string().min(1).default('routine-audio-private'),
  SUPABASE_ENVIRONMENT_IMAGES_BUCKET: z.string()
    .min(1)
    .default('environment-images-private'),
  SUPABASE_MEAL_IMAGES_BUCKET: z.string().min(1).default('meal-images-private'),
  SUPABASE_BODY_PROGRESS_IMAGES_BUCKET: z.string()
    .min(1)
    .default('body-progress-images-private'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
}).superRefine((value, ctx) => {
  if (value.ELEVENLABS_ENABLED && value.ELEVENLABS_API_KEY.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ELEVENLABS_API_KEY'],
      message: 'ELEVENLABS_API_KEY is required when ELEVENLABS_ENABLED=true',
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) { 
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');

  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export type AppEnv = typeof env;
