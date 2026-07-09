import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeMyEnvironment,
  getMyLatestEnvironmentAnalysis,
} from '../services/environment-vision.service';
import { createFakeSupabase } from './helpers/fakeSupabase';
import { TEST_AUTH, TEST_DATA_URL } from './helpers/testFixtures';

test('environment analysis saves image and normalized equipment', async () => {
  const supabase = createFakeSupabase();
  const originalFetch = global.fetch;

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        status: { code: 200, text: 'OK' },
        records: [
          {
            _tags: [
              { name: 'dumbbell', prob: 0.97 },
              { name: 'indoor', prob: 0.88 },
              { name: 'mat', prob: 0.72 },
            ],
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    const result = await analyzeMyEnvironment(supabase as never, TEST_AUTH, {
      image_data_url: TEST_DATA_URL,
    });

    assert.ok(result);
    assert.deepEqual(result?.detected_equipment, ['mancuernas', 'colchoneta']);
    assert.match(result?.training_context ?? '', /Equipo visible confirmado/i);
    assert.equal(supabase.tables.environment_analyses.length, 1);
    assert.equal(supabase.uploads.length, 1);
    assert.match(result?.source_image_url ?? '', /signed\.example/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('latest environment analysis still resolves when signed URL generation fails', async () => {
  const supabase = createFakeSupabase(
    {
      environment_analyses: [
        {
          id: 'env-1',
          user_id: TEST_AUTH.userId,
          source_image_path: 'environment-images/user/env-1/source.jpg',
          source_image_content_type: 'image/jpeg',
          ximilar_model: 'photo/tags/v2/tags',
          detected_tags: [{ name: 'dumbbell', prob: 0.97 }],
          detected_equipment: ['mancuernas'],
          detected_space_tags: ['interior'],
          summary: 'Resumen',
          training_context: 'Contexto',
          ximilar_response: {},
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
    { failSignedUrl: true },
  );

  const result = await getMyLatestEnvironmentAnalysis(supabase as never, TEST_AUTH);

  assert.ok(result);
  assert.equal(result?.source_image_url, null);
  assert.deepEqual(result?.detected_equipment, ['mancuernas']);
});
