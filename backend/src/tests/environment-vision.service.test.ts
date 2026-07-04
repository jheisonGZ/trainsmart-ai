import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeMyEnvironment } from '../services/environment-vision.service';
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
