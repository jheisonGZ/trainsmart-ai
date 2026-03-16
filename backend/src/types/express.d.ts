import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
      supabase?: RequestSupabaseClient;
    }
  }
}

export {};
