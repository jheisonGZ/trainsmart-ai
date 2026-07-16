import { checkDatabaseConnection } from '../lib/db';
import { env } from '../config/env';
import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import { getMyProgressStats } from '../services/stats.service';
import { asyncHandler, sendSuccess } from '../utils/api-response';

export const getProgressStatsController = asyncHandler(async (req, res) => {
  const stats = await getMyProgressStats(
    getRequestSupabase(req),
    getRequestAuth(req),
    typeof req.query.weeks === 'number' ? req.query.weeks : undefined,
  );

  return sendSuccess(res, stats);
});

export const getHealthCheckController = asyncHandler(async (_req, res) => {
  let databaseConnected = true;

  try {
    await checkDatabaseConnection();
  } catch {
    databaseConnected = false;
  }

  const payload = {
    status: databaseConnected ? 'ok' : 'degraded',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    database: {
      connected: databaseConnected,
    },
    llm: {
      configured: Boolean(env.GROQ_API_KEY),
      model: env.LLM_MODEL,
    },
  };

  return sendSuccess(res, payload, databaseConnected ? 200 : 503);
});
