import type { NextFunction, Request, Response } from 'express';

import { createSupabaseFromRequest, type RequestSupabaseClient } from '../lib/supabase/request';
import { getAuthUser } from '../lib/supabase-auth';
import type { AuthUser } from '../types/auth.types';
import { UnauthorizedError } from '../utils/api-response';

export function getRequestAuth(req: Request): AuthUser {
  if (!req.auth) {
    throw new UnauthorizedError('Missing authenticated user context.');
  }

  return req.auth;
}

export function getRequestSupabase(req: Request): RequestSupabaseClient {
  if (!req.supabase) {
    throw new UnauthorizedError('Missing Supabase request client.');
  }

  return req.supabase;
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const supabase = createSupabaseFromRequest(req);
    req.supabase = supabase;
    req.auth = await getAuthUser(req, supabase);
    next();
  } catch (error) {
    next(error);
  }
}
