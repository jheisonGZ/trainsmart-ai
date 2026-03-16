import type { Request } from 'express';

import { createSupabaseFromRequest, type RequestSupabaseClient } from './supabase/request';
import type { AuthUser } from '../types/auth.types';
import { UnauthorizedError } from '../utils/api-response';

export function getBearerToken(headerValue?: string | null): string | null {
  if (!headerValue || !headerValue.startsWith('Bearer ')) {
    return null;
  }

  const token = headerValue.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function extractStringRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function extractProvider(user: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}) {
  const provider =
    user.app_metadata?.provider ??
    user.user_metadata?.provider ??
    user.app_metadata?.providers;

  if (typeof provider === 'string') {
    return provider;
  }

  if (Array.isArray(provider) && typeof provider[0] === 'string') {
    return provider[0];
  }

  return undefined;
}

export async function getAuthUser(
  request: Request,
  supabase: RequestSupabaseClient = createSupabaseFromRequest(request),
): Promise<AuthUser> {
  const accessToken = getBearerToken(request.headers.authorization);

  if (!accessToken) {
    throw new UnauthorizedError('Missing Bearer token.');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError('Invalid or expired Supabase access token.');
  }

  const appMetadata = extractStringRecord(user.app_metadata);
  const userMetadata = extractStringRecord(user.user_metadata);

  return {
    userId: user.id,
    email: user.email ?? '',
    provider: extractProvider(user),
    accessToken,
    appMetadata,
    userMetadata,
  };
}
