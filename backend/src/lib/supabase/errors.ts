import type { PostgrestError } from '@supabase/supabase-js';

import { logger } from '../logger';

export function throwIfSupabaseError(
  error: PostgrestError | null,
  message: string,
): asserts error is null {
  if (!error) {
    return;
  }

  logger.error(message, {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message,
  });

  throw new Error(message);
}
