import { getRequestAuth, getRequestSupabase } from '../middlewares/auth.middleware';
import {
  analyzeMyMeal,
  getMyLatestMealAnalysis,
  listMyMealAnalyses,
} from '../services/nutrition-vision.service';
import { asyncHandler, sendSuccess } from '../utils/api-response';

export const analyzeMyMealController = asyncHandler(async (req, res) => {
  const analysis = await analyzeMyMeal(getRequestSupabase(req), getRequestAuth(req), req.body);
  return sendSuccess(res, analysis, 201);
});

export const getMyLatestMealAnalysisController = asyncHandler(async (req, res) => {
  const analysis = await getMyLatestMealAnalysis(
    getRequestSupabase(req),
    getRequestAuth(req),
  );
  return sendSuccess(res, analysis);
});

export const listMyMealAnalysesController = asyncHandler(async (req, res) => {
  const analyses = await listMyMealAnalyses(
    getRequestSupabase(req),
    getRequestAuth(req),
    typeof req.query.limit === 'number' ? req.query.limit : undefined,
  );
  return sendSuccess(res, analyses);
});
