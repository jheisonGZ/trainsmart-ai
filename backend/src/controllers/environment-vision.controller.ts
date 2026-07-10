import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import {
  analyzeMyEnvironment,
  clearMyEnvironmentAnalysis,
  getMyLatestEnvironmentAnalysis,
} from '../services/environment-vision.service';
import { asyncHandler, sendSuccess } from '../utils/api-response';

export const analyzeMyEnvironmentController = asyncHandler(async (req, res) => {
  const analysis = await analyzeMyEnvironment(
    getRequestSupabase(req),
    getRequestAuth(req),
    req.body,
  );

  return sendSuccess(res, analysis, 201);
});

export const getMyLatestEnvironmentAnalysisController = asyncHandler(async (req, res) => {
  const analysis = await getMyLatestEnvironmentAnalysis(
    getRequestSupabase(req),
    getRequestAuth(req),
  );

  return sendSuccess(res, analysis);
});

export const clearMyEnvironmentAnalysisController = asyncHandler(async (req, res) => {
  await clearMyEnvironmentAnalysis(getRequestSupabase(req), getRequestAuth(req));

  return sendSuccess(res, {
    message: 'Reconocimiento del entorno eliminado correctamente.',
  });
});
