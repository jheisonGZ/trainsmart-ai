import { z } from 'zod';

import { env } from '../config/env';
import { PreconditionFailedError, RateLimitedError, ValidationError } from '../utils/api-response';
import { parseRetryAfterSeconds } from '../utils/retry-after';
import { logger } from './logger';

const REQUEST_TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional() })),
        }),
      }),
    )
    .min(1),
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestGeneration(imageBuffer: Buffer, mimeType: string, prompt: string) {
  const base64Image = imageBuffer.toString('base64');
  const endpoint = `${env.GEMINI_BASE_URL.replace(/\/$/, '')}/models/${env.GEMINI_VISION_MODEL}:generateContent`;

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Image } },
            { text: prompt },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

export async function analyzeImageWithPrompt(
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string,
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new PreconditionFailedError('GEMINI_API_KEY is not configured.');
  }

  let response: Response | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      response = await requestGeneration(imageBuffer, mimeType, prompt);
    } catch (error) {
      logger.error('Gemini vision request failed before receiving a response.', { error, attempt });
      throw new PreconditionFailedError('Vision analysis request failed or timed out.');
    }

    if (response.ok) {
      break;
    }

    const isRetryable = response.status === 503 || response.status === 429;

    if (!isRetryable || attempt === MAX_ATTEMPTS) {
      const errorText = await response.text();
      logger.error('Gemini vision request failed', { status: response.status, body: errorText, attempt });

      if (response.status === 429) {
        const retryAfterSeconds = parseRetryAfterSeconds(response.headers, errorText);
        throw new RateLimitedError(
          'El analisis visual alcanzo su limite de uso temporal.',
          retryAfterSeconds,
        );
      }

      throw new PreconditionFailedError(`Vision provider responded with status ${response.status}.`);
    }

    logger.warn('Gemini vision request temporarily unavailable, retrying.', {
      status: response.status,
      attempt,
    });
    await sleep(RETRY_DELAY_MS * attempt);
  }

  const rawPayload = (await response!.json()) as unknown;
  const parsed = geminiResponseSchema.safeParse(rawPayload);

  if (!parsed.success) {
    throw new ValidationError('Vision provider returned an unexpected payload shape.');
  }

  const text = parsed.data.candidates[0].content.parts
    .map((part) => part.text ?? '')
    .join('')
    .trim();

  return text;
}
