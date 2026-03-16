import { getHealthHistoryByUserId } from '../repositories/health.repository';
import { getProfileByUserId } from '../repositories/profiles.repository';
import { asyncHandler, sendSuccess } from '../utils/api-response';
import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';

export const getAuthenticatedUser = asyncHandler(async (req, res) => {
  const auth = getRequestAuth(req);
  const supabase = getRequestSupabase(req);
  const [profile, healthHistory] = await Promise.all([
    getProfileByUserId(supabase, auth.userId),
    getHealthHistoryByUserId(supabase, auth.userId),
  ]);

  return sendSuccess(res, {
    user_id: auth.userId,
    email: auth.email,
    provider: auth.provider,
    has_profile: Boolean(profile),
    has_health_history: Boolean(healthHistory),
    profile_completed: profile?.completed ?? false,
    health_completed: healthHistory?.completed ?? false,
    profile_confirmed: profile?.profile_confirmed ?? false,
  });
});
