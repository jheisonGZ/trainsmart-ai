import { z } from 'zod';

import { env } from '../config/env';
import { logger } from './logger';

const REQUEST_TIMEOUT_MS = 30000;

const bodyCategoryTrendSchema = z.enum([
  'incremento',
  'incremento_leve',
  'reduccion',
  'reduccion_leve',
  'sin_cambio',
  'no_visible',
]);

const DEFAULT_TREND_NOTES: Record<z.infer<typeof bodyCategoryTrendSchema>, string> = {
  incremento: 'Se aprecia un aumento visual notable respecto al registro anterior.',
  incremento_leve: 'Se aprecia un ligero incremento visual respecto al registro anterior.',
  reduccion: 'Se aprecia una reduccion visual notable respecto al registro anterior.',
  reduccion_leve: 'Se aprecia una ligera reduccion visual respecto al registro anterior.',
  sin_cambio: 'No se aprecian cambios visuales claros.',
  no_visible: 'No se distingue con claridad en una o ambas fotos.',
};

const bodyCategoryComparisonSchema = z
  .object({
    visible: z.boolean(),
    trend: bodyCategoryTrendSchema,
    note: z.string().nullable().optional(),
  })
  .transform((value) => ({
    ...value,
    note: value.note && value.note.trim().length > 0 ? value.note : DEFAULT_TREND_NOTES[value.trend],
  }));

const BODY_CATEGORY_KEYS = [
  'definicion_muscular',
  'volumen_muscular',
  'abdomen',
  'brazos',
  'hombros',
  'pecho',
  'espalda',
  'piernas',
  'postura',
  'simetria',
] as const;

const categoriesSchema = z.object(
  Object.fromEntries(
    BODY_CATEGORY_KEYS.map((key) => [key, bodyCategoryComparisonSchema]),
  ) as Record<(typeof BODY_CATEGORY_KEYS)[number], typeof bodyCategoryComparisonSchema>,
);

export const visionComparisonSchema = z.object({
  same_conditions: z.boolean(),
  reliability_note: z.string().nullable().optional().transform((value) => value ?? null),
  overall_change_level: z.enum(['leve', 'moderado', 'alto']),
  progress_summary: z.string().min(1),
  categories: categoriesSchema,
  observations: z.array(z.string()).max(8),
});

export type VisionComparisonResult = z.infer<typeof visionComparisonSchema>;

const SYSTEM_PROMPT = `Eres un asistente que compara dos fotos corporales de la MISMA persona, tomadas en fechas distintas, con fines puramente educativos de seguimiento visual aproximado. NO es una evaluacion clinica ni medica.

Reglas estrictas que debes seguir siempre:
- NUNCA menciones porcentajes de grasa corporal, masa muscular, peso en kilogramos, medidas en centimetros, ni ninguna cifra que implique una medicion fisica real. Solo describe cambios de forma cualitativa.
- Si una zona del cuerpo no es claramente visible en AMBAS fotos, marca "visible": false y "trend": "no_visible" para esa categoria. No inventes un cambio si no lo puedes ver.
- Si la iluminacion, el angulo, la ropa o la postura son muy distintos entre las dos fotos, marca "same_conditions": false y explica brevemente en "reliability_note" por que la comparacion puede perder precision. Si las condiciones son razonablemente parecidas, usa "same_conditions": true y "reliability_note": null.
- "overall_change_level" debe reflejar solo cuantas zonas visibles tuvieron cambios: "leve" si hay pocos o ningun cambio notable, "moderado" si hay un cambio notable o varios leves, "alto" si hay varios cambios notables.
- Las categorias a evaluar son EXACTAMENTE estas 10 claves: definicion_muscular, volumen_muscular, abdomen, brazos, hombros, pecho, espalda, piernas, postura, simetria.
- Para "postura", compara si la persona se ve mas o menos erguida/relajada respecto a la foto anterior; si el angulo de la foto cambio demasiado para comparar eso con confianza, usa "no_visible" en vez de asumir.
- Para "simetria", evalua si el cuerpo se ve visualmente simetrico entre lado izquierdo y derecho; si no lo puedes evaluar con confianza en ambas fotos, usa "no_visible".
- "observations" debe tener entre 1 y 6 frases especificas y concretas (ejemplo: "Se aprecia una reduccion visual del volumen abdominal.", "Los hombros parecen mas definidos."), solo para categorias visibles que tuvieron cambio. Si no hay cambios relevantes, deja el arreglo vacio.
- Responde EXCLUSIVAMENTE con un objeto JSON valido, sin texto adicional, sin markdown, con esta forma exacta:
{
  "same_conditions": boolean,
  "reliability_note": string o null,
  "overall_change_level": "leve" | "moderado" | "alto",
  "progress_summary": string,
  "categories": {
    "definicion_muscular": { "visible": boolean, "trend": "incremento"|"incremento_leve"|"reduccion"|"reduccion_leve"|"sin_cambio"|"no_visible", "note": string },
    "volumen_muscular": { ... },
    "abdomen": { ... },
    "brazos": { ... },
    "hombros": { ... },
    "pecho": { ... },
    "espalda": { ... },
    "piernas": { ... },
    "postura": { ... },
    "simetria": { ... }
  },
  "observations": string[]
}`;

function extractJsonPayload(rawText: string) {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fencedMatch?.[1]?.trim() ?? trimmed;
}

export interface VisionComparisonInput {
  previousImageBase64: string;
  previousContentType: string;
  currentImageBase64: string;
  currentContentType: string;
}

export async function compareBodyProgressWithVisionLLM(
  input: VisionComparisonInput,
): Promise<VisionComparisonResult | null> {
  if (!env.GROQ_API_KEY.trim()) {
    return null;
  }

  const endpoint = `${env.LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.VISION_LLM_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Foto anterior (registro previo):' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${input.previousContentType};base64,${input.previousImageBase64}`,
                },
              },
              { type: 'text', text: 'Foto actual (nuevo registro):' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${input.currentContentType};base64,${input.currentImageBase64}`,
                },
              },
              {
                type: 'text',
                text: 'Compara ambas fotos siguiendo las reglas del sistema y responde solo con el JSON pedido.',
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('Vision LLM request failed; falling back to tag heuristic.', {
        status: response.status,
        body: errorText,
      });
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const rawContent = payload.choices?.[0]?.message?.content;
    const text =
      typeof rawContent === 'string'
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent
              .map((part) => (typeof part === 'object' && part && 'text' in part ? String(part.text ?? '') : ''))
              .join('')
          : '';

    if (!text.trim()) {
      logger.warn('Vision LLM returned empty content; falling back to tag heuristic.');
      return null;
    }

    const parsedJson = JSON.parse(extractJsonPayload(text));
    const validated = visionComparisonSchema.safeParse(parsedJson);

    if (!validated.success) {
      logger.warn('Vision LLM output failed schema validation; falling back to tag heuristic.', {
        issues: validated.error.issues,
        raw: text,
      });
      return null;
    }

    return validated.data;
  } catch (error) {
    logger.warn('Vision LLM comparison failed; falling back to tag heuristic.', { error });
    return null;
  }
}
