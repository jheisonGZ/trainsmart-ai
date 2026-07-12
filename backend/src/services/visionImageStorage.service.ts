import type { RequestSupabaseClient } from '../lib/supabase/request';
import { logger } from '../lib/logger';
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

export async function deleteVisionImage(
  supabase: RequestSupabaseClient,
  bucket: string,
  path: string,
) {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  throwIfStorageError(error, 'Failed to delete vision image.');
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

export async function downloadVisionImageAsBase64(
  supabase: RequestSupabaseClient,
  bucket: string,
  path: string,
): Promise<{ base64: string; contentType: string } | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);

    if (error || !data) {
      throw error ?? new Error('No data returned from storage download.');
    }

    const arrayBuffer = await data.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      base64,
      contentType: data.type || 'image/jpeg',
    };
  } catch (error) {
    logger.warn('Could not download vision image for comparison.', {
      bucket,
      path,
      error,
    });
    return null;
  }
}

export async function createVisionImageSignedUrlSafely(
  supabase: RequestSupabaseClient,
  bucket: string,
  path: string,
) {
  try {
    return await createVisionImageSignedUrl(supabase, bucket, path);
  } catch (error) {
    logger.warn('Could not create signed URL for vision image. Returning response without image URL.', {
      bucket,
      path,
      error,
    });

    return null;
  }
}
