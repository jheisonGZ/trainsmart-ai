import { readFileSync } from 'fs';
import path from 'path';

export const TEST_AUTH = {
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'vision@test.com',
  provider: 'google',
  accessToken: 'test-token',
  appMetadata: {},
  userMetadata: {},
};

export const TEST_PROFILE = {
  user_id: TEST_AUTH.userId,
  name: 'Vision User',
  goal: 'gain_muscle',
  completed: true,
  profile_confirmed: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const TEST_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6V1fQAAAAASUVORK5CYII=';

export function readImageAsDataUrl(relativePathFromBackendSrcTests: string) {
  const absolutePath = path.resolve(
    __dirname,
    relativePathFromBackendSrcTests,
  );
  const fileBuffer = readFileSync(absolutePath);
  const extension = path.extname(absolutePath).replace('.', '').toLowerCase();
  const mimeType = extension === 'webp' ? 'image/webp' : 'image/jpeg';

  return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
}
