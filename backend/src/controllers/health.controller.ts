import {
  createMyHealthHistory,
  getMyHealthHistory,
  updateMyHealthHistory,
} from '../services/health.service';
import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import { NotFoundError, asyncHandler, sendSuccess } from '../utils/api-response';

export const getMyHealthHistoryController = asyncHandler(async (req, res) => {
  const healthHistory = await getMyHealthHistory(getRequestSupabase(req), getRequestAuth(req));

  if (!healthHistory) {
    throw new NotFoundError('Health history not found.');
  }

  return sendSuccess(res, healthHistory);
});

export const createMyHealthHistoryController = asyncHandler(async (req, res) => {
  const healthHistory = await createMyHealthHistory(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.body,
  );
  return sendSuccess(res, healthHistory, 201);
});

export const updateMyHealthHistoryController = asyncHandler(async (req, res) => {
  const healthHistory = await updateMyHealthHistory(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.body,
  );
  return sendSuccess(res, healthHistory);
});
