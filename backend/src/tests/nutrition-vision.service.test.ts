import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeMyMeal } from '../services/nutrition-vision.service';
import { createFakeSupabase } from './helpers/fakeSupabase';
import { TEST_AUTH, TEST_DATA_URL, TEST_PROFILE } from './helpers/testFixtures';

test('nutrition analysis saves meal analysis and aligns educational feedback with goal', async () => {
  const supabase = createFakeSupabase({
    profiles: [TEST_PROFILE],
  });
  const originalFetch = global.fetch;

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        status: { code: 200, text: 'OK' },
        records: [
          {
            _tags: [
              { name: 'chicken', prob: 0.95 },
              { name: 'rice', prob: 0.89 },
              { name: 'broccoli', prob: 0.8 },
            ],
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    const result = await analyzeMyMeal(supabase as never, TEST_AUTH, {
      image_data_url: TEST_DATA_URL,
    });

    assert.ok(result);
    assert.deepEqual(result?.detected_food_groups, [
      'proteina',
      'carbohidratos',
      'vegetales',
    ]);
    assert.match(result?.goal_alignment ?? '', /ganancia muscular/i);
    assert.equal(supabase.tables.meal_analyses.length, 1);
    assert.equal(supabase.uploads.length, 1);
    assert.match(result?.source_image_url ?? '', /signed\.example/);
  } finally {
    global.fetch = originalFetch;
  }
});
