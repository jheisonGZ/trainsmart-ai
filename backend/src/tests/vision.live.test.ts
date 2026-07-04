import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeMyBodyProgress } from '../services/body-progress-vision.service';
import { analyzeMyEnvironment } from '../services/environment-vision.service';
import { analyzeMyMeal } from '../services/nutrition-vision.service';
import { createFakeSupabase } from './helpers/fakeSupabase';
import { readImageAsDataUrl, TEST_AUTH, TEST_PROFILE } from './helpers/testFixtures';

const shouldRunLiveTests =
  process.env.RUN_XIMILAR_LIVE_TESTS === 'true' && Boolean(process.env.XIMILAR_API_TOKEN);

test('live Ximilar environment analysis smoke test', async (t) => {
  if (!shouldRunLiveTests) {
    t.skip('Set RUN_XIMILAR_LIVE_TESTS=true and XIMILAR_API_TOKEN to run live tests.');
    return;
  }

  const supabase = createFakeSupabase();
  const result = await analyzeMyEnvironment(supabase as never, TEST_AUTH, {
    image_data_url: readImageAsDataUrl('../../../../frontend/public/images/perfil.webp'),
  });

  assert.ok(result);
  assert.equal(supabase.tables.environment_analyses.length, 1);
  assert.equal(supabase.uploads.length, 1);
});

test('live Ximilar nutrition analysis smoke test', async (t) => {
  if (!shouldRunLiveTests) {
    t.skip('Set RUN_XIMILAR_LIVE_TESTS=true and XIMILAR_API_TOKEN to run live tests.');
    return;
  }

  const supabase = createFakeSupabase({
    profiles: [TEST_PROFILE],
  });
  const result = await analyzeMyMeal(supabase as never, TEST_AUTH, {
    image_data_url: readImageAsDataUrl('../../../../frontend/public/images/perfil.webp'),
  });

  assert.ok(result);
  assert.equal(supabase.tables.meal_analyses.length, 1);
  assert.equal(supabase.uploads.length, 1);
});

test('live Ximilar body progress analysis smoke test', async (t) => {
  if (!shouldRunLiveTests) {
    t.skip('Set RUN_XIMILAR_LIVE_TESTS=true and XIMILAR_API_TOKEN to run live tests.');
    return;
  }

  const supabase = createFakeSupabase();
  const baseline = await analyzeMyBodyProgress(supabase as never, TEST_AUTH, {
    image_data_url: readImageAsDataUrl('../../../../frontend/public/images/login.webp'),
  });
  const comparison = await analyzeMyBodyProgress(supabase as never, TEST_AUTH, {
    image_data_url: readImageAsDataUrl('../../../../frontend/public/images/login.webp'),
  });

  assert.ok(baseline);
  assert.ok(comparison);
  assert.equal(supabase.tables.body_progress_entries.length, 2);
  assert.equal(supabase.uploads.length, 2);
});
