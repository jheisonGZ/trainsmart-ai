import { createMyBodyMetric, getMyBodyMetrics } from '../services/metrics.service';
import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import { asyncHandler, sendSuccess } from '../utils/api-response';

export const getMyBodyMetricsController = asyncHandler(async (req, res) => {
  const metrics = await getMyBodyMetrics(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.query as never,
  );
  return sendSuccess(res, metrics);
});

export const createMyBodyMetricController = asyncHandler(async (req, res) => {
  const metric = await createMyBodyMetric(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.body,
  );
  return sendSuccess(res, metric, 201);
});
