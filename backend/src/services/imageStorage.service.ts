import type { RequestSupabaseClient } from '../lib/supabase/request';
import { ApiError } from '../utils/api-response';

const SIGNED_URL_EXPIRES_IN_SECONDS = 300;

export function buildImageStoragePath(prefix: string, userId: string, filename: string) {
  return `${prefix}/${userId}/${filename}`;
}

export async function uploadImage(
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

  if (error) {
    throw new ApiError(503, 'Failed to upload image.');
  }
}

export async function createImageSignedUrl(
  supabase: RequestSupabaseClient,
  bucket: string,
  path: string,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS);

  if (error || !data?.signedUrl) {
    throw new ApiError(503, 'Failed to create image access URL.');
  }

  return {
    imageUrl: data.signedUrl,
    expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
  };
}

export async function removeImages(
  supabase: RequestSupabaseClient,
  bucket: string,
  paths: string[],
) {
  if (paths.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from(bucket).remove(paths);

  if (error) {
    throw new ApiError(503, 'Failed to remove stored images.');
  }
}
