import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';

import { env } from '../../config/env';

export type RequestSupabaseClient = SupabaseClient;

interface RequestLike {
  headers: Request['headers'];
}

function getAuthorizationHeader(request: RequestLike) {
  const header = request.headers.authorization;
  return typeof header === 'string' && header.trim().length > 0 ? header : undefined;
}

export function createSupabaseWithAccessToken(accessToken?: string | null) {
  const headers =
    accessToken && accessToken.trim().length > 0
      ? {
          Authorization: `Bearer ${accessToken.trim()}`,
        }
      : undefined;

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers,
    },
  });
}

export function createSupabaseFromRequest(request: RequestLike) {
  const authorizationHeader = getAuthorizationHeader(request);
  const accessToken = authorizationHeader?.replace(/^Bearer\s+/i, '').trim();

  return createSupabaseWithAccessToken(accessToken);
}
