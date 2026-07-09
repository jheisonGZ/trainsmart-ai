import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import {
  XimilarConfigurationError,
  XimilarRequestError,
  XimilarResponseError,
} from './errors';
import {
  ximilarPersonDetectionResponseSchema,
  ximilarPhotoTaggingResponseSchema,
  type XimilarPersonDetectionResponse,
  type XimilarPhotoTaggingResponse,
} from './types';

const REQUEST_TIMEOUT_MS = 20_000;

interface Base64ImageOptions {
  imageBase64: string;
}

function normalizeBase64Image(imageBase64: string): string {
  return imageBase64
    .trim()
    .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
}

function validateBase64Image(imageBase64: string): void {
  if (imageBase64.trim().length === 0) {
    throw new XimilarRequestError('Image base64 is empty.');
  }
}

async function callXimilar<TSchemaOutput>(options: {
  endpointPath: string;
  body: unknown;
  responseSchema: {
    safeParse(payload: unknown):
      | { success: true; data: TSchemaOutput }
      | { success: false; error: { flatten(): unknown } };
  };
  responseErrorMessage: string;
}): Promise<TSchemaOutput> {
  if (env.XIMILAR_API_TOKEN.trim().length === 0) {
    throw new XimilarConfigurationError('XIMILAR_API_TOKEN is not configured.');
  }

  const endpoint = `${env.XIMILAR_BASE_URL.replace(/\/$/, '')}${options.endpointPath}`;

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${env.XIMILAR_API_TOKEN}`,
      },
      body: JSON.stringify(options.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    logger.error('Ximilar request failed before receiving a response.', {
      error,
      endpoint,
    });

    throw new XimilarRequestError('Ximilar request failed or timed out.', {
      endpoint,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();

    logger.error('Ximilar request failed.', {
      endpoint,
      status: response.status,
      body: errorText,
    });

    throw new XimilarRequestError(
      `Ximilar responded with status ${response.status}.`,
      {
        endpoint,
        ximilarStatus: response.status,
        ximilarBody: errorText,
      },
    );
  }

  const payload = (await response.json()) as unknown;

  logger.info('Ximilar raw payload.', {
    endpoint,
    payload,
  });

  const parsedPayload = options.responseSchema.safeParse(payload);

  if (!parsedPayload.success) {
    logger.error('Ximilar payload validation failed.', {
      endpoint,
      validationError: parsedPayload.error.flatten(),
      payload,
    });

    throw new XimilarResponseError(
      options.responseErrorMessage,
      parsedPayload.error.flatten(),
    );
  }

  return parsedPayload.data;
}

export async function analyzeImageTagsWithXimilar({
  imageBase64,
}: Base64ImageOptions): Promise<XimilarPhotoTaggingResponse> {
  const normalizedImageBase64 = normalizeBase64Image(imageBase64);

  validateBase64Image(normalizedImageBase64);

  return callXimilar({
    endpointPath: '/photo/tags/v2/tags',
    body: {
      lang: 'en',
      tagging_mode: 'complex',
      records: [
        {
          _base64: normalizedImageBase64,
        },
      ],
    },
    responseSchema: ximilarPhotoTaggingResponseSchema,
    responseErrorMessage: 'Ximilar returned an unexpected tagging payload.',
  });
}

export async function detectPeopleWithXimilar({
  imageBase64,
}: Base64ImageOptions): Promise<XimilarPersonDetectionResponse> {
  const normalizedImageBase64 = normalizeBase64Image(imageBase64);

  validateBase64Image(normalizedImageBase64);

  return callXimilar({
    endpointPath: '/identity/v2/person',
    body: {
      records: [
        {
          _base64: normalizedImageBase64,
        },
      ],
    },
    responseSchema: ximilarPersonDetectionResponseSchema,
    responseErrorMessage: 'Ximilar returned an unexpected person-detection payload.',
  });
}