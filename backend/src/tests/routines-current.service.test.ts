import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCurrentRoutineDashboard,
  getCurrentRoutineToday,
} from '../services/routines.service';
import { createFakeSupabase } from './helpers/fakeSupabase';
import { TEST_AUTH } from './helpers/testFixtures';

test('current routine endpoints return null when the user has no active approved routine', async () => {
  const supabase = createFakeSupabase();

  const [dashboard, today] = await Promise.all([
    getCurrentRoutineDashboard(supabase as never, TEST_AUTH),
    getCurrentRoutineToday(supabase as never, TEST_AUTH),
  ]);

  assert.equal(dashboard, null);
  assert.equal(today, null);
});
