import { ElevenLabsClient, ElevenLabsError } from '@elevenlabs/elevenlabs-js';

import { elevenLabsConfig } from '../config/elevenlabs';
import { ApiError, PreconditionFailedError } from '../utils/api-response';

interface GenerateSpeechInput {
  text: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
}

let client: ElevenLabsClient | null = null;

function getClient() {
  if (!elevenLabsConfig.enabled) {
    throw new PreconditionFailedError('ElevenLabs text-to-speech is disabled.');
  }

  if (!elevenLabsConfig.apiKey) {
    throw new PreconditionFailedError('ElevenLabs text-to-speech is not configured.');
  }

  client ??= new ElevenLabsClient({
    apiKey: elevenLabsConfig.apiKey,
    timeoutInSeconds: elevenLabsConfig.timeoutInSeconds,
    maxRetries: 1,
  });

  return client;
}

function mapElevenLabsError(error: unknown): never {
  if (error instanceof ElevenLabsError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      throw new ApiError(503, 'Text-to-speech provider authentication failed.');
    }

    if (error.statusCode === 429) {
      throw new ApiError(429, 'Text-to-speech quota or rate limit reached.');
    }

    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      throw new ApiError(503, 'Text-to-speech provider rejected the request.');
    }

    throw new ApiError(503, 'Text-to-speech provider is temporarily unavailable.');
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    throw new ApiError(503, 'Text-to-speech provider timed out.');
  }

  throw error;
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Buffer[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks);
}

export async function generateSpeechFromText(input: GenerateSpeechInput): Promise<Buffer> {
  try {
    const audio = await getClient().textToSpeech.convert(
      input.voiceId ?? elevenLabsConfig.voiceId,
      {
        text: input.text,
        modelId: input.modelId ?? elevenLabsConfig.modelId,
        outputFormat: (input.outputFormat ?? elevenLabsConfig.outputFormat) as never,
        applyTextNormalization: 'auto',
        voiceSettings: {
          stability: 0.55,
          similarityBoost: 0.75,
        },
      },
      {
        timeoutInSeconds: elevenLabsConfig.timeoutInSeconds,
        maxRetries: 1,
      },
    );

    return streamToBuffer(audio);
  } catch (error) {
    return mapElevenLabsError(error);
  }
}
