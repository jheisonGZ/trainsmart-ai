import { z } from 'zod';

import { env } from '../config/env';
import { ROUTINE_OUTPUT_SCHEMA } from '../prompts/output-schema';
import { PreconditionFailedError, ValidationError } from '../utils/api-response';
import { logger } from './logger';

const REQUEST_TIMEOUT_MS = 30000;
const REPAIR_TEMPERATURE = 0.2;

const chatCompletionSchema = z.object({
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.union([
            z.string(),
            z.array(
              z.object({
                type: z.string(),
                text: z.string().optional(),
              }),
            ),
          ]),
        }),
      }),
    )
    .min(1),
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallLlmResult {
  content: string;
  modelProvider: string;
  modelName: string;
  temperature: number;
}

export interface GenerateJsonOptions<TSchema extends z.ZodTypeAny> {
  schema: TSchema;
  messages: ChatMessage[];
  temperature?: number;
}

export interface GenerateJsonResult<TSchema extends z.ZodTypeAny> {
  output: z.infer<TSchema>;
  modelProvider: string;
  modelName: string;
  temperature: number;
}

function getModelProvider(model: string) {
  if (env.LLM_BASE_URL.includes('groq.com')) {
    return {
      modelProvider: 'groq',
      modelName: model,
    };
  }

  const [provider, ...nameParts] = model.split('/');
  return {
    modelProvider: nameParts.length > 0 ? provider : 'openai-compatible',
    modelName: nameParts.length > 0 ? nameParts.join('/') : model,
  };
}

function extractMessageText(content: string | Array<{ type: string; text?: string }>) {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .filter((part) => typeof part.text === 'string' && part.text.trim().length > 0)
    .map((part) => part.text?.trim())
    .filter((part): part is string => Boolean(part))
    .join('\n');
}

function extractJsonPayload(rawText: string) {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fencedMatch?.[1]?.trim() ?? trimmed;
}

function normalizeJsonValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeJsonValue(entry)]),
    );
  }

  return value;
}

function formatIssuePath(path: Array<string | number>) {
  return path.length > 0 ? path.join('.') : 'root';
}

function formatZodIssues(issues: z.ZodIssue[]) {
  return issues.map((issue) => `- ${formatIssuePath(issue.path)}: ${issue.message}`).join('\n');
}

async function repairStructuredOutput(
  messages: ChatMessage[],
  rawContent: string,
  errorContext: string,
) {
  const repairResult = await callLLM(
    [
      ...messages,
      {
        role: 'assistant',
        content: extractJsonPayload(rawContent),
      },
      {
        role: 'user',
        content: [
          'Tu respuesta anterior no cumple el formato requerido.',
          errorContext,
          'Corrigela y devuelve solo JSON valido.',
          'No uses markdown.',
          'No dejes campos requeridos vacios.',
        ].join('\n\n'),
      },
    ],
    REPAIR_TEMPERATURE,
  );

  return repairResult.content;
}

export async function callLLM(
  messages: ChatMessage[],
  temperature = 0.4,
): Promise<CallLlmResult> {
  if (!env.GROQ_API_KEY) {
    throw new PreconditionFailedError('GROQ_API_KEY is not configured.');
  }

  const endpoint = `${env.LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`;

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        messages,
        temperature,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    logger.error('LLM request failed before receiving a response.', {
      error,
      endpoint,
    });
    throw new PreconditionFailedError('LLM request failed or timed out.');
  }

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('LLM request failed', {
      status: response.status,
      body: errorText,
    });

    throw new PreconditionFailedError(
      `LLM provider responded with status ${response.status}.`,
    );
  }

  const rawPayload = (await response.json()) as unknown;
  const parsedPayload = chatCompletionSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    throw new ValidationError('LLM provider returned an unexpected payload shape.');
  }

  return {
    content: extractMessageText(parsedPayload.data.choices[0].message.content),
    ...getModelProvider(parsedPayload.data.model ?? env.LLM_MODEL),
    temperature,
  };
}

export async function generateStructuredRoutine(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.4,
) {
  return generateStructuredJson({
    schema: ROUTINE_OUTPUT_SCHEMA,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
  });
}

export async function generateStructuredJson<TSchema extends z.ZodTypeAny>({
  schema,
  messages,
  temperature = 0.4,
}: GenerateJsonOptions<TSchema>): Promise<GenerateJsonResult<TSchema>> {
  const llmResult = await callLLM(messages, temperature);

  const parseAndValidate = (rawContent: string) => {
    const jsonText = extractJsonPayload(rawContent);
    const parsedJson = normalizeJsonValue(JSON.parse(jsonText));
    return schema.safeParse(parsedJson);
  };

  let validated: z.SafeParseReturnType<unknown, z.infer<TSchema>>;

  try {
    validated = parseAndValidate(llmResult.content);
  } catch (error) {
    logger.warn('LLM returned non-parseable JSON', {
      rawContent: llmResult.content,
      error,
    });

    const repairedContent = await repairStructuredOutput(
      messages,
      llmResult.content,
      'El contenido anterior no era JSON parseable. Corrigelo sin cambiar la intencion de la rutina.',
    );

    try {
      validated = parseAndValidate(repairedContent);
    } catch (repairError) {
      logger.warn('LLM repair also returned non-parseable JSON', {
        rawContent: repairedContent,
        error: repairError,
      });
      throw new ValidationError('LLM did not return valid JSON.');
    }
  }

  if (!validated.success) {
    logger.warn('LLM output failed schema validation, attempting repair.', {
      issues: validated.error.issues,
    });

    const repairedContent = await repairStructuredOutput(
      messages,
      llmResult.content,
      [
        'El JSON anterior no cumple el schema requerido.',
        'Errores detectados:',
        formatZodIssues(validated.error.issues),
      ].join('\n'),
    );

    const repairedValidated = (() => {
      try {
        return parseAndValidate(repairedContent);
      } catch (repairError) {
        logger.warn('LLM repair returned invalid JSON after schema failure.', {
          rawContent: repairedContent,
          error: repairError,
        });
        throw new ValidationError('LLM did not return valid JSON after repair.');
      }
    })();

    if (!repairedValidated.success) {
      throw new ValidationError(
        'LLM output does not match the expected schema.',
        repairedValidated.error.flatten(),
      );
    }

    return {
      output: repairedValidated.data,
      modelProvider: llmResult.modelProvider,
      modelName: llmResult.modelName,
      temperature: llmResult.temperature,
    };
  }

  return {
    output: validated.data,
    modelProvider: llmResult.modelProvider,
    modelName: llmResult.modelName,
    temperature: llmResult.temperature,
  };
}
