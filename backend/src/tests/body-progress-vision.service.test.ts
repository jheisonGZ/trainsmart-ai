import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeMyBodyProgress } from '../services/body-progress-vision.service';
import { createFakeSupabase } from './helpers/fakeSupabase';
import { TEST_AUTH, TEST_DATA_URL } from './helpers/testFixtures';

test('body progress analysis saves entry and compares with previous snapshot', async () => {
  const supabase = createFakeSupabase({
    body_progress_entries: [
      {
        id: 'previous-entry',
        user_id: TEST_AUTH.userId,
        source_image_path: 'body-progress-images/user/previous/source.jpg',
        source_image_content_type: 'image/jpeg',
        ximilar_tagging_model: 'photo/tags/v2/tags',
        ximilar_person_model: 'identity/v2/person',
        detected_tags: [{ name: 'person', prob: 0.91 }],
        person_count: 1,
        quality_warnings: [],
        body_focus_tags: ['persona visible'],
        entry_summary: 'Anterior',
        comparison_summary: 'Anterior',
        comparison_notes: 'Anterior',
        compared_to_entry_id: null,
        ximilar_tagging_response: {},
        ximilar_person_response: {},
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  });
  const originalFetch = global.fetch;
  let callIndex = 0;

  global.fetch = async () => {
    callIndex += 1;

    if (callIndex === 1) {
      return new Response(
        JSON.stringify({
          status: { code: 200, text: 'OK' },
          records: [
            {
              _tags: [
                { name: 'person', prob: 0.96 },
                { name: 'fitness', prob: 0.82 },
                { name: 'gym', prob: 0.77 },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        status: { code: 200, text: 'OK' },
        records: [
          {
            _objects: [
              {
                name: 'person',
                prob: 0.97,
                bound_box: [10, 20, 100, 200],
              },
            ],
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const result = await analyzeMyBodyProgress(supabase as never, TEST_AUTH, {
      image_data_url: TEST_DATA_URL,
    });

    assert.ok(result);
    assert.equal(result?.person_count, 1);
    assert.equal(result?.compared_to_entry_id, 'previous-entry');
    assert.match(result?.comparison_summary ?? '', /comparacion/i);
    assert.ok(result?.posture_inferred, 'posture_inferred should be present');
    assert.ok(Array.isArray(result?.visible_body_zones), 'visible_body_zones should be an array');
    assert.ok(result?.change_summary, 'change_summary should be present');
    assert.equal(supabase.tables.body_progress_entries.length, 2);
    assert.equal(supabase.uploads.length, 1);
    assert.match(result?.source_image_url ?? '', /signed\.example/);
  } finally {
    global.fetch = originalFetch;
  }
});
