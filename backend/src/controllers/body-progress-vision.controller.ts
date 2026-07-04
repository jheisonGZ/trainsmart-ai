import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import {
  analyzeMyBodyProgress,
  getMyLatestBodyProgressEntry,
  listMyBodyProgressEntries,
} from '../services/body-progress-vision.service';
import { asyncHandler, sendSuccess } from '../utils/api-response';

export const analyzeMyBodyProgressController = asyncHandler(async (req, res) => {
  const entry = await analyzeMyBodyProgress(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.body,
  );
  return sendSuccess(res, entry, 201);
});

export const getMyLatestBodyProgressEntryController = asyncHandler(async (req, res) => {
  const entry = await getMyLatestBodyProgressEntry(
    getRequestSupabase(req),
    getRequestAuth(req),
  );
  return sendSuccess(res, entry);
});

export const listMyBodyProgressEntriesController = asyncHandler(async (req, res) => {
  const entries = await listMyBodyProgressEntries(
    getRequestSupabase(req),
    getRequestAuth(req),
    typeof req.query.limit === 'number' ? req.query.limit : undefined,
  );
  return sendSuccess(res, entries);
});
