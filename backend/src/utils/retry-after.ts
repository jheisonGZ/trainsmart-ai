/**
 * Best-effort extraction of "how long until this quota/rate limit resets" from a
 * provider's HTTP response, so the frontend can show a real countdown instead of
 * a generic error. Returns undefined when no reliable signal is available -
 * callers should not fabricate a number in that case.
 */
export function parseRetryAfterSeconds(
  headers: Headers | undefined,
  bodyText?: string,
): number | undefined {
  const headerValue = headers?.get('retry-after');

  if (headerValue) {
    const asSeconds = Number(headerValue);

    if (Number.isFinite(asSeconds) && asSeconds >= 0) {
      return Math.ceil(asSeconds);
    }

    const asDate = Date.parse(headerValue);

    if (!Number.isNaN(asDate)) {
      return Math.max(0, Math.ceil((asDate - Date.now()) / 1000));
    }
  }

  if (bodyText) {
    // Google APIs (Gemini): details[].{"@type":".../google.rpc.RetryInfo","retryDelay":"20s"}
    const retryDelayMatch = bodyText.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);

    if (retryDelayMatch?.[1]) {
      return Math.ceil(Number(retryDelayMatch[1]));
    }

    // OpenAI-compatible providers (Groq): "... Please try again in 1m2.393s" / "in 20s"
    const tryAgainMatch = bodyText.match(/try again in\s+(?:(\d+)m)?(\d+(?:\.\d+)?)s/i);

    if (tryAgainMatch) {
      const minutes = Number(tryAgainMatch[1] ?? 0);
      const seconds = Number(tryAgainMatch[2]);
      return Math.ceil(minutes * 60 + seconds);
    }
  }

  return undefined;
}
