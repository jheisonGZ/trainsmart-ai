import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import {
  confirmProfile,
  createProfile,
  getProfileByUserId,
  updateProfile,
} from '../repositories/profiles.repository';
import { PreconditionFailedError } from '../utils/api-response';
import type { CreateProfileInput, UpdateProfileInput } from '../validators/profiles.schemas';

export async function getMyProfile(supabase: RequestSupabaseClient, auth: AuthUser) {
  return getProfileByUserId(supabase, auth.userId);
}

export async function createMyProfile(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  input: CreateProfileInput,
) {
  return createProfile(supabase, auth.userId, input);
}

export async function updateMyProfile(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  input: UpdateProfileInput,
) {
  return updateProfile(supabase, auth.userId, input);
}

export async function confirmMyProfile(supabase: RequestSupabaseClient, auth: AuthUser) {
  const profile = await getProfileByUserId(supabase, auth.userId);

  if (!profile || !profile.completed) {
    throw new PreconditionFailedError(
      'Profile must be completed before it can be confirmed.',
    );
  }

  return confirmProfile(supabase, auth.userId);
}
