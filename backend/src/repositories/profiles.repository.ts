import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import { calculateAge } from '../utils/dates';
import { NotFoundError } from '../utils/api-response';
import type { Profile } from '../types/profile.types';
import type { CreateProfileInput, UpdateProfileInput } from '../validators/profiles.schemas';

function isProfileComplete(profile: Partial<Profile>) {
  return Boolean(
    profile.name &&
      profile.birth_date &&
      profile.sex &&
      profile.height_cm &&
      profile.weight_kg &&
      profile.experience_level &&
      profile.goal &&
      profile.days_per_week &&
      profile.time_per_session,
  );
}

export async function getProfileByUserId(supabase: RequestSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<Profile>();

  throwIfSupabaseError(error, 'Failed to fetch profile.');
  return data ?? null;
}

export async function createProfile(
  supabase: RequestSupabaseClient,
  userId: string,
  input: CreateProfileInput,
) {
  const age = input.birth_date ? calculateAge(input.birth_date) : null;
  const payload = {
    user_id: userId,
    name: input.name ?? null,
    birth_date: input.birth_date ?? null,
    age,
    sex: input.sex ?? null,
    height_cm: input.height_cm ?? null,
    weight_kg: input.weight_kg ?? null,
    experience_level: input.experience_level ?? null,
    goal: input.goal ?? null,
    days_per_week: input.days_per_week ?? null,
    time_per_session: input.time_per_session ?? null,
    email: input.email ?? null,
    avatar_url: input.avatar_url ?? null,
    completed: isProfileComplete({
      ...input,
      age,
    }),
    profile_confirmed: false,
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(payload)
    .select('*')
    .single<Profile>();

  throwIfSupabaseError(error, 'Failed to create profile.');
  return data;
}

export async function updateProfile(
  supabase: RequestSupabaseClient,
  userId: string,
  input: UpdateProfileInput,
) {
  const existing = await getProfileByUserId(supabase, userId);

  if (!existing) {
    throw new NotFoundError('Profile not found');
  }

  const nextAge =
    input.birth_date === undefined ? existing.age : calculateAge(input.birth_date ?? null);
  const merged: Partial<Profile> = {
    ...existing,
    ...input,
    age: nextAge,
  };
  const completed = isProfileComplete(merged);
  const payload = {
    ...input,
    age: nextAge,
    completed,
    profile_confirmed: completed ? existing.profile_confirmed : false,
    confirmed_at: completed && existing.profile_confirmed ? existing.confirmed_at : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle<Profile>();

  throwIfSupabaseError(error, 'Failed to update profile.');

  if (!data) {
    throw new NotFoundError('Profile not found');
  }

  return data;
}

export async function confirmProfile(supabase: RequestSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      profile_confirmed: true,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle<Profile>();

  throwIfSupabaseError(error, 'Failed to confirm profile.');

  if (!data) {
    throw new NotFoundError('Profile not found');
  }

  return data;
}
