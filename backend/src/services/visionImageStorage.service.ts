import type { RequestSupabaseClient } from '../lib/supabase/request';
import { ApiError } from '../utils/api-response';

const SIGNED_URL_EXPIRES_IN_SECONDS = 300;

function throwIfStorageError(error: { message: string } | null, message: string) {
  if (!error) {
    return;
  }

  throw new ApiError(503, message);
}

export function buildVisionImageStoragePath(
  scope: 'environment' | 'meal' | 'body-progress',
  userId: string,
  resourceId: string,
  extension: string,
) {
  return `${scope}-images/${userId}/${resourceId}/source.${extension}`;
}

export async function uploadVisionImage(
  supabase: RequestSupabaseClient,
  bucket: string,
  path: string,
  image: Buffer,
  contentType: string,
) {
  const { error } = await supabase.storage.from(bucket).upload(path, image, {
    contentType,
    cacheControl: '3600',
    upsert: true,
  });

  throwIfStorageError(error, 'Failed to upload vision image.');
}

export async function createVisionImageSignedUrl(
  supabase: RequestSupabaseClient,
  bucket: string,
  path: string,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS);

  throwIfStorageError(error, 'Failed to create vision image access URL.');

  if (!data?.signedUrl) {
    throw new ApiError(503, 'Failed to create vision image access URL.');
  }

  return {
    imageUrl: data.signedUrl,
    expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
  };
}
