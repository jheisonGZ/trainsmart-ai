import { ApiClientError } from "./api";

/**
 * Providers (Groq, Gemini, ElevenLabs) can tell us exactly how long until a
 * rate limit/quota resets. The backend forwards that as `details.retryAfterSeconds`
 * on a 429. Returns null when the error isn't a rate limit or no reliable
 * countdown was available - callers should fall back to a generic message
 * rather than invent a number.
 */
export function getRetryAfterSeconds(error: unknown): number | null {
  if (!(error instanceof ApiClientError) || error.status !== 429) {
    return null;
  }

  const details = error.details as { retryAfterSeconds?: unknown } | undefined;
  const value = details?.retryAfterSeconds;

  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.ceil(value)
    : null;
}

export function isRateLimitError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 429;
}
