const SENSITIVE_KEY_PATTERN = /(password|token|secret|key|authorization|cookie)/i;

export function sanitizeForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
    (accumulator, [key, itemValue]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        accumulator[key] = '[REDACTED]';
      } else {
        accumulator[key] = sanitizeForLog(itemValue);
      }

      return accumulator;
    },
    {},
  );
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeProfilePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...payload };

  if (typeof normalized.birthdate === 'string' && typeof normalized.birth_date !== 'string') {
    normalized.birth_date = normalized.birthdate;
  }

  if (typeof normalized.days_per_week === 'string' && normalized.days_per_week.trim()) {
    normalized.days_per_week = Number(normalized.days_per_week);
  }

  if (typeof normalized.time_per_session === 'string' && normalized.time_per_session.trim()) {
    normalized.time_per_session = Number(normalized.time_per_session);
  }

  if (normalized.experience_level === 'returning') {
    normalized.experience_level = 'intermediate';
  }

  delete normalized.birthdate;
  delete normalized.imc;
  delete normalized.imc_category;
  delete normalized.uid;

  return normalized;
}

export function normalizeHealthPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    ...payload,
    injuries: normalizeStringArray(payload.injuries),
    joint_problems: normalizeStringArray(payload.joint_problems),
    conditions: normalizeStringArray(payload.conditions),
    limitations: normalizeStringArray(payload.limitations),
    notes: normalizeNullableText(payload.notes),
  };
}

export function normalizeMetricPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...payload };

  if (typeof normalized.weight_kg === 'string' && normalized.weight_kg.trim()) {
    normalized.weight_kg = Number(normalized.weight_kg);
  }

  if (typeof normalized.height_cm === 'string' && normalized.height_cm.trim()) {
    normalized.height_cm = Number(normalized.height_cm);
  }

  return normalized;
}
